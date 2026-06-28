# LexEstate — Real Estate English Platform

Aplicación web para aprender vocabulario inmobiliario en inglés mediante flashcards, tests y repetición espaciada (SRS).

## Características

- **Vocabulario**: Explorador con búsqueda, filtros por categoría y nivel (A1–C2)
- **Flashcards**: Sesiones de estudio con valoración por niveles
- **Escribir**: Práctica de escritura con distintos tipos de pista
- **Test**: Preguntas de opción múltiple con cronómetro y resultados
- **Repaso**: Revisión de errores recientes con flashcards
- **Progreso**: Estadísticas detalladas por nivel y categoría
- **Favoritos**: Lista de términos guardados
- **Admin**: CRUD completo con importación CSV/JSON y detección de duplicados
- **SRS integrado**: Repetición espaciada — los términos difíciles aparecen más frecuentemente
- **Modo sin sesión**: El progreso se guarda en localStorage si no hay usuario activo

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 3 + Lucide React
- **Backend**: PHP (producción) o Node.js (desarrollo local)
- **Base de datos**: Supabase (PostgreSQL)

## Instalación

### Requisitos
- Node.js 20+
- PHP 8.1+ con extensión cURL (producción)
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/lexestate.git
cd lexestate
npm install
```

### 2. Base de datos

En el editor SQL de Supabase, ejecuta en orden:

```
migrations/001_schema.sql      # Tablas y RLS
migrations/002_vocabulary.sql  # Vocabulario inicial (~500 términos)
```

### 3. Configuración (producción PHP)

```bash
cp public/config.example.php public/config.php
```

Edita `public/config.php` con tus valores:

```php
const LEXESTATE_SUPABASE_URL   = 'https://tu-proyecto.supabase.co';
const LEXESTATE_SERVICE_KEY    = 'tu-service-role-key';
const LEXESTATE_ADMIN_EMAIL    = 'tu@email.com';
const LEXESTATE_ADMIN_PASSWORD_HASH = '...';  // ver paso siguiente
```

Genera el hash de contraseña:

```bash
php scripts/generate_hash.php tu_contraseña
```

Pega el resultado en `LEXESTATE_ADMIN_PASSWORD_HASH`.

### 4. Build y despliegue

```bash
npm run build
```

Copia el contenido de `dist/` y `public/` a tu servidor PHP. La estructura final en el servidor debe ser:

```
/                     ← raíz del dominio
├── index.html        (del build)
├── assets/           (del build)
├── api.php
├── config.php        (¡no en git!)
└── .htaccess
```

## Desarrollo local

```bash
npm run dev
```

Abre `http://localhost:5173`. Para que el API funcione en dev, necesitas un servidor PHP local apuntando a `public/` como raíz con `config.php` configurado, o usar un proxy en `vite.config.ts`.

## Estructura del proyecto

```
lexestate/
├── src/
│   ├── App.tsx                        # Router principal
│   ├── pages/lexestate/
│   │   ├── LexEstateApp.tsx           # App principal con sidebar
│   │   ├── LexEstateLogin.tsx         # Pantalla de login
│   │   ├── api.ts                     # Cliente API
│   │   ├── types.ts                   # Tipos TypeScript
│   │   ├── srs.ts                     # Lógica de repetición espaciada
│   │   ├── localStorage.ts            # Progreso local (modo sin sesión)
│   │   └── components/                # Secciones de la app
│   └── assets/
├── public/
│   ├── api.php                        # Backend PHP
│   ├── config.example.php             # Plantilla de configuración
│   └── .htaccess                      # Enrutamiento SPA
├── migrations/
│   ├── 001_schema.sql                 # Schema de base de datos
│   └── 002_vocabulary.sql             # Vocabulario inicial
└── scripts/
    └── generate_hash.php              # Genera hash bcrypt para la contraseña
```

## Licencia

MIT
