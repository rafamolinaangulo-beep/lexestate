<?php
ini_set('display_errors', '0');
ob_start();

$_sessionLifetime = 60 * 60 * 24 * 30; // 30 days
ini_set('session.gc_maxlifetime', (string)$_sessionLifetime);
session_set_cookie_params([
    'lifetime' => $_sessionLifetime,
    'path'     => '/',
    'secure'   => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['REQUEST_METHOD'];
$path   = $_GET['path'] ?? ($_SERVER['PATH_INFO'] ?? '/');

function json_response(int $code, mixed $data): never {
    ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function supabase_request(string $path, string $method = 'GET', ?array $body = null, ?string $prefer = null): mixed {
    $url     = LEXESTATE_SUPABASE_URL . '/rest/v1' . $path;
    $headers = [
        'apikey: '        . LEXESTATE_SERVICE_KEY,
        'Authorization: Bearer ' . LEXESTATE_SERVICE_KEY,
        'Content-Type: application/json',
    ];
    if ($prefer !== null) $headers[] = 'Prefer: ' . $prefer;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 30,
    ]);
    if ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $resp = curl_exec($ch);
    curl_close($ch);
    return ($resp && $resp !== 'null') ? json_decode($resp, true) : null;
}

try {

    // ── Auth: Login ───────────────────────────────────────────────────────────
    if ($path === '/api/auth/login' && $method === 'POST') {
        $body  = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = strtolower(trim($body['email'] ?? ''));
        $pwd   = $body['password'] ?? '';
        if ($email === strtolower(LEXESTATE_ADMIN_EMAIL) && password_verify($pwd, LEXESTATE_ADMIN_PASSWORD_HASH)) {
            $_SESSION['lexestate_user'] = $email;
            json_response(200, ['ok' => true, 'email' => $email]);
        }
        json_response(401, ['error' => 'Credenciales incorrectas']);
    }

    // ── Auth: Logout ──────────────────────────────────────────────────────────
    if ($path === '/api/auth/logout' && $method === 'POST') {
        session_destroy();
        json_response(200, ['ok' => true]);
    }

    // ── LexEstate: auth check ─────────────────────────────────────────────────
    if ($path === '/api/lexestate/auth' && $method === 'GET') {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        $role = (strtolower($email) === strtolower(LEXESTATE_ADMIN_EMAIL)) ? 'admin' : 'user';
        json_response(200, ['ok' => true, 'email' => $email, 'role' => $role, 'display_name' => null]);
    }

    // ── LexEstate: categories ─────────────────────────────────────────────────
    if ($path === '/api/lexestate/categories' && $method === 'GET') {
        $rows = supabase_request('/lexestate_categories?select=*&order=name.asc') ?: [];
        json_response(200, $rows);
    }

    // ── LexEstate: terms ──────────────────────────────────────────────────────
    if (preg_match('#^/api/lexestate/terms(?:/([^/?]+))?$#', $path, $lm)) {
        $termId = $lm[1] ?? null;
        if ($method === 'GET' && !$termId) {
            $baseUrl = '/lexestate_terms?select=*,category:lexestate_categories(id,name,slug,icon)';
            $baseUrl .= '&order=word_en.asc';
            if (!empty($_GET['category_id'])) $baseUrl .= '&category_id=eq.' . rawurlencode($_GET['category_id']);
            if (!empty($_GET['level']))       $baseUrl .= '&level=eq.'       . rawurlencode($_GET['level']);
            if (!empty($_GET['difficulty']))  $baseUrl .= '&difficulty=eq.'  . rawurlencode($_GET['difficulty']);
            if (!empty($_GET['limit'])) {
                $url = $baseUrl . '&limit=' . intval($_GET['limit']);
                if (!empty($_GET['offset'])) $url .= '&offset=' . intval($_GET['offset']);
                $rows = supabase_request($url) ?: [];
            } else {
                // Paginate to retrieve all terms (Supabase defaults to 1000 per request)
                $pageSize = 1000; $offset = 0; $rows = [];
                while (true) {
                    $page = supabase_request($baseUrl . '&limit=' . $pageSize . '&offset=' . $offset) ?: [];
                    $rows = array_merge($rows, $page);
                    if (count($page) < $pageSize) break;
                    $offset += $pageSize;
                }
            }
            if (!empty($_GET['search'])) {
                $q = strtolower($_GET['search']);
                $rows = array_values(array_filter($rows, function($r) use ($q) {
                    return str_contains(strtolower($r['word_en'] ?? ''), $q)
                        || str_contains(strtolower($r['translation_es'] ?? ''), $q)
                        || str_contains(strtolower($r['definition_en'] ?? ''), $q)
                        || str_contains(strtolower($r['definition_es'] ?? ''), $q);
                }));
            }
            json_response(200, $rows);
        }
        if ($method === 'GET' && $termId) {
            $row = supabase_request('/lexestate_terms?id=eq.' . rawurlencode($termId)
                . '&select=*,category:lexestate_categories(id,name,slug,icon)&limit=1');
            if (empty($row)) json_response(404, ['error' => 'Término no encontrado']);
            json_response(200, $row[0]);
        }
    }

    // ── LexEstate: progress ───────────────────────────────────────────────────
    if (preg_match('#^/api/lexestate/progress(?:/([^/?/]+)(?:/([^/?]+))?)?$#', $path, $lpm)) {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        $lTermId = $lpm[1] ?? null;
        $subCmd  = $lpm[2] ?? null;

        if ($method === 'GET' && !$lTermId) {
            $rows = supabase_request('/lexestate_user_progress?user_id=eq.' . rawurlencode($email) . '&select=*') ?: [];
            json_response(200, $rows);
        }
        if ($method === 'POST' && $lTermId && $subCmd === 'status') {
            $body   = json_decode(file_get_contents('php://input'), true);
            $status = $body['status'] ?? 'pending';
            supabase_request('/lexestate_user_progress?user_id=eq.' . rawurlencode($email) . '&term_id=eq.' . rawurlencode($lTermId),
                'PATCH', ['status' => $status, 'updated_at' => date('c')], 'return=minimal');
            supabase_request('/lexestate_user_progress', 'POST',
                ['user_id' => $email, 'term_id' => $lTermId, 'status' => $status, 'updated_at' => date('c')],
                'resolution=ignore,return=minimal');
            json_response(200, ['ok' => true]);
        }
        if ($method === 'POST' && $lTermId && !$subCmd) {
            $body         = json_decode(file_get_contents('php://input'), true);
            $isCorrect    = (bool)($body['is_correct'] ?? false);
            $exerciseType = $body['exercise_type'] ?? 'unknown';
            $questionType = $body['question_type'] ?? 'unknown';

            $cur = supabase_request('/lexestate_user_progress?user_id=eq.' . rawurlencode($email)
                . '&term_id=eq.' . rawurlencode($lTermId) . '&select=*&limit=1');
            $cur = $cur[0] ?? ['status' => 'pending', 'correct_answers' => 0, 'wrong_answers' => 0,
                               'attempts' => 0, 'correct_streak' => 0];

            $streak = $isCorrect ? (($cur['correct_streak'] ?? 0) + 1) : 0;
            if (!$isCorrect) {
                $status = ($cur['status'] ?? 'pending') === 'mastered' ? 'learning' : 'difficult';
            } else {
                $status = $streak >= 3 ? 'mastered' : 'learning';
            }
            $intervals  = ['difficult' => 0, 'learning' => $streak <= 1 ? 1 : ($streak === 2 ? 3 : 7), 'mastered' => 14, 'pending' => 0];
            $days       = $intervals[$status] ?? 1;
            $nextReview = (new DateTime("+{$days} days"))->format('c');

            $upd = [
                'user_id' => $email, 'term_id' => $lTermId, 'status' => $status,
                'correct_answers' => ($cur['correct_answers'] ?? 0) + ($isCorrect ? 1 : 0),
                'wrong_answers'   => ($cur['wrong_answers'] ?? 0) + ($isCorrect ? 0 : 1),
                'attempts'        => ($cur['attempts'] ?? 0) + 1,
                'correct_streak'  => $streak,
                'last_reviewed_at' => date('c'),
                'next_review_at'  => $nextReview,
                'updated_at'      => date('c'),
            ];
            supabase_request('/lexestate_user_progress', 'POST', $upd, 'resolution=merge-duplicates,return=representation');
            supabase_request('/lexestate_review_history', 'POST', [
                'user_id' => $email, 'term_id' => $lTermId,
                'exercise_type' => $exerciseType, 'question_type' => $questionType,
                'is_correct' => $isCorrect, 'reviewed_at' => date('c'),
            ], 'return=minimal');
            json_response(200, $upd);
        }
    }

    // ── LexEstate: favorites ──────────────────────────────────────────────────
    if (preg_match('#^/api/lexestate/favorites(?:/([^/?]+))?$#', $path, $lfm)) {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        $lfTermId = $lfm[1] ?? null;
        if ($method === 'GET' && !$lfTermId) {
            json_response(200, supabase_request('/lexestate_favorites?user_id=eq.' . rawurlencode($email) . '&select=*') ?: []);
        }
        if ($method === 'POST' && $lfTermId) {
            $existing = supabase_request('/lexestate_favorites?user_id=eq.' . rawurlencode($email)
                . '&term_id=eq.' . rawurlencode($lfTermId) . '&select=id&limit=1');
            if (!empty($existing)) {
                supabase_request('/lexestate_favorites?user_id=eq.' . rawurlencode($email)
                    . '&term_id=eq.' . rawurlencode($lfTermId), 'DELETE', null, 'return=minimal');
                json_response(200, ['is_favorite' => false]);
            } else {
                supabase_request('/lexestate_favorites', 'POST',
                    ['user_id' => $email, 'term_id' => $lfTermId], 'return=minimal');
                json_response(200, ['is_favorite' => true]);
            }
        }
    }

    // ── LexEstate: quiz questions ─────────────────────────────────────────────
    if ($path === '/api/lexestate/quiz/questions' && $method === 'GET') {
        $count = min(50, max(5, intval($_GET['count'] ?? 10)));
        $catId = $_GET['category_id'] ?? null;
        $level = $_GET['level'] ?? null;
        $qType = $_GET['question_type'] ?? null;
        $url   = '/lexestate_terms?select=*&limit=200&order=random.asc';
        if ($catId) $url .= '&category_id=eq.' . rawurlencode($catId);
        if ($level) $url .= '&level=eq.'       . rawurlencode($level);
        $terms = supabase_request($url) ?: [];
        if (count($terms) < 4) json_response(400, ['error' => 'No hay suficientes términos']);
        shuffle($terms);
        $terms    = array_slice($terms, 0, $count);
        $allTerms = supabase_request('/lexestate_terms?select=word_en,translation_es,definition_es&limit=300') ?: [];
        $types    = ['definition_es_to_word','definition_en_to_word','word_to_translation_es','word_to_definition_es'];
        $questions = [];
        foreach ($terms as $i => $t) {
            $type        = $qType ?? $types[$i % count($types)];
            $distractors = array_values(array_filter($allTerms, fn($d) => $d['word_en'] !== $t['word_en']));
            shuffle($distractors);
            $distractors = array_slice($distractors, 0, 3);
            $qt = ''; $correct = ''; $opts = [];
            switch ($type) {
                case 'definition_es_to_word': $qt = $t['definition_es']; $correct = $t['word_en']; $opts = [$correct, ...array_column($distractors, 'word_en')]; break;
                case 'definition_en_to_word': $qt = $t['definition_en']; $correct = $t['word_en']; $opts = [$correct, ...array_column($distractors, 'word_en')]; break;
                case 'word_to_translation_es': $qt = 'What is the Spanish for: "' . $t['word_en'] . '"?'; $correct = $t['translation_es']; $opts = [$correct, ...array_column($distractors, 'translation_es')]; break;
                case 'word_to_definition_es': $qt = 'Which definition matches "' . $t['word_en'] . '"?'; $correct = $t['definition_es']; $opts = [$correct, ...array_column($distractors, 'definition_es')]; break;
                default: $qt = $t['definition_es']; $correct = $t['word_en']; $opts = [$correct, ...array_column($distractors, 'word_en')];
            }
            shuffle($opts);
            $questions[] = ['term' => $t, 'question_type' => $type, 'question_text' => $qt, 'correct_answer' => $correct, 'options' => array_slice($opts, 0, 4), 'explanation' => $t['definition_en'] ?? ''];
        }
        json_response(200, $questions);
    }

    // ── LexEstate: quiz results ───────────────────────────────────────────────
    if ($path === '/api/lexestate/quiz/results') {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        if ($method === 'GET') {
            json_response(200, supabase_request('/lexestate_quiz_results?user_id=eq.' . rawurlencode($email) . '&select=*&order=created_at.desc&limit=20') ?: []);
        }
        if ($method === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $row  = [
                'user_id'         => $email,
                'score'           => intval($body['score'] ?? 0),
                'total_questions' => intval($body['total_questions'] ?? 0),
                'percentage'      => floatval($body['percentage'] ?? 0),
                'category_id'     => $body['category_id'] ?? null,
                'level'           => $body['level'] ?? null,
                'question_type'   => $body['question_type'] ?? null,
                'time_seconds'    => intval($body['time_seconds'] ?? 0),
                'mistakes'        => json_encode($body['mistakes'] ?? []),
                'created_at'      => date('c'),
            ];
            $res = supabase_request('/lexestate_quiz_results', 'POST', $row, 'return=representation');
            json_response(201, $res[0] ?? $row);
        }
    }

    // ── LexEstate: stats ──────────────────────────────────────────────────────
    if ($path === '/api/lexestate/stats' && $method === 'GET') {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        // Count all terms (paginated)
        $pageSize = 1000; $offset = 0; $allIds = [];
        while (true) {
            $page = supabase_request('/lexestate_terms?select=id&limit=' . $pageSize . '&offset=' . $offset) ?: [];
            $allIds = array_merge($allIds, $page);
            if (count($page) < $pageSize) break;
            $offset += $pageSize;
        }
        $totalCount = count($allIds);
        $prog      = supabase_request('/lexestate_user_progress?user_id=eq.' . rawurlencode($email) . '&select=status,correct_answers,attempts,next_review_at') ?: [];
        $mastered  = count(array_filter($prog, fn($p) => $p['status'] === 'mastered'));
        $learning  = count(array_filter($prog, fn($p) => $p['status'] === 'learning'));
        $difficult = count(array_filter($prog, fn($p) => $p['status'] === 'difficult'));
        $correct   = array_sum(array_column($prog, 'correct_answers'));
        $attempts  = array_sum(array_column($prog, 'attempts'));
        $today     = date('Y-m-d');
        $dueToday  = count(array_filter($prog, fn($p) => !$p['next_review_at'] || substr($p['next_review_at'], 0, 10) <= $today));
        json_response(200, [
            'total'     => $totalCount,
            'mastered'  => $mastered,
            'learning'  => $learning,
            'difficult' => $difficult,
            'pending'   => max(0, $totalCount - $mastered - $learning - $difficult),
            'accuracy'  => $attempts > 0 ? intval(round(100 * $correct / $attempts)) : 0,
            'streak'    => 0,
            'due_today' => $dueToday,
        ]);
    }

    // ── LexEstate: settings ───────────────────────────────────────────────────
    if ($path === '/api/lexestate/settings') {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (!$email) json_response(401, ['error' => 'No autenticado']);
        if ($method === 'GET') {
            $row = supabase_request('/lexestate_settings?user_id=eq.' . rawurlencode($email) . '&select=*&limit=1');
            json_response(200, $row[0] ?? ['theme' => 'dark','language' => 'es','audio_speed' => 1.0,'auto_pronunciation' => false,'daily_goal' => 10,'weekly_goal' => 50]);
        }
        if ($method === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $body['user_id']    = $email;
            $body['updated_at'] = date('c');
            supabase_request('/lexestate_settings', 'POST', $body, 'resolution=merge-duplicates,return=minimal');
            json_response(200, ['ok' => true]);
        }
    }

    // ── LexEstate: admin terms CRUD ───────────────────────────────────────────
    if (preg_match('#^/api/lexestate/admin/terms(?:/([^/?]+))?$#', $path, $lam)) {
        $email = $_SESSION['lexestate_user'] ?? '';
        if (strtolower($email) !== strtolower(LEXESTATE_ADMIN_EMAIL)) json_response(403, ['error' => 'Acceso restringido al administrador']);
        $laId = $lam[1] ?? null;
        if ($method === 'POST' && !$laId) {
            $body = json_decode(file_get_contents('php://input'), true);
            $body['created_at'] = date('c'); $body['updated_at'] = date('c');
            if (isset($body['synonyms'])      && is_array($body['synonyms']))      $body['synonyms']      = '{' . implode(',', $body['synonyms'])      . '}';
            if (isset($body['related_terms']) && is_array($body['related_terms'])) $body['related_terms'] = '{' . implode(',', $body['related_terms']) . '}';
            if (isset($body['tags'])          && is_array($body['tags']))          $body['tags']          = '{' . implode(',', $body['tags'])          . '}';
            $res = supabase_request('/lexestate_terms', 'POST', $body, 'return=representation');
            json_response(201, $res[0] ?? $body);
        }
        if ($method === 'PATCH' && $laId) {
            $body = json_decode(file_get_contents('php://input'), true);
            $body['updated_at'] = date('c');
            supabase_request('/lexestate_terms?id=eq.' . rawurlencode($laId), 'PATCH', $body, 'return=minimal');
            json_response(200, ['ok' => true]);
        }
        if ($method === 'DELETE' && $laId) {
            supabase_request('/lexestate_terms?id=eq.' . rawurlencode($laId), 'DELETE', null, 'return=minimal');
            json_response(200, ['ok' => true]);
        }
    }

    json_response(404, ['error' => 'Ruta no encontrada']);

} catch (Throwable $e) {
    json_response(500, ['error' => $e->getMessage()]);
}
