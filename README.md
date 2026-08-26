# Trabajo de Fin de Grado

Aplicación web para consultar una base de datos MongoDB mediante preguntas en lenguaje natural. La aplicación genera y valida consultas de agregación con IA, presenta los resultados en tablas o gráficos y aplica autenticación, roles y controles de seguridad.

## Tecnologías

Next.js 16, React 19, TypeScript, MongoDB, NextAuth y OpenAI mediante Vercel AI SDK.

## Funcionalidades

- Generación de consultas MongoDB a partir de preguntas en lenguaje natural.
- Validación de consultas y controles frente a instrucciones maliciosas.
- Autenticación con Google o credenciales.
- Gestión de usuarios, roles, grupos, espacios y paneles.
- Flujos de aprobación para consultas de coste elevado.
- Visualización de resultados y exportación de datos.

## Instalación e inicio

Requisitos: Node.js 18 o superior, una base de datos MongoDB y credenciales de OpenAI y Google OAuth.

```bash
git clone https://github.com/AlexLopezGomez/trabajo-fin-de-grado.git
cd trabajo-fin-de-grado
npm ci
cp .env.example .env.local
```

Abre `.env.local` y completa, como mínimo, estas variables:

```env
MONGODB_URI=
MONGODB_DATABASE=
AUTH_DATABASE=
OPENAI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
```

`AUTH_MONGODB_URI` es opcional. Si no se define, la aplicación utiliza `MONGODB_URI` también para la base de datos de autenticación.

## Inicializar usuarios y roles

Después de definir `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` en `.env.local`, crea el usuario administrador y los cuatro roles integrados:

```bash
npm run seed
```

También puedes crear un administrador u operador por separado. Para el operador, define `OPERATOR_EMAIL` y `OPERATOR_PASSWORD` en `.env.local`:

```bash
npm run create-admin
npm run create-operator
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Catálogo de datos

El repositorio incluye el catálogo de esquema usado por la aplicación para la base de datos del proyecto. Si se conecta una base de datos distinta, será necesario generar un catálogo compatible antes de realizar consultas con IA.

## Comandos

```bash
npm run dev
npm run build
npm start
npm run seed
npm run create-admin
npm run create-operator
```
