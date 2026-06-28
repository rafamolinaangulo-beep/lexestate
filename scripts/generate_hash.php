<?php
// Usage: php scripts/generate_hash.php your_password
$password = $argv[1] ?? '';
if (!$password) {
    echo "Usage: php scripts/generate_hash.php <password>\n";
    exit(1);
}
echo password_hash($password, PASSWORD_DEFAULT) . "\n";
