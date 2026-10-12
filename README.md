# AppVolticaSolar

Plataforma de Voltica para el dimensionamiento técnico, la simulación energética y la evaluación financiera de sistemas solares fotovoltaicos On-Grid, Off-Grid e híbridos con almacenamiento en baterías.

## Requisitos

- Node.js 20.9 o superior (recomendado: Node.js 22 LTS).
- npm 10 o superior.

## Instalación

```bash
git clone https://github.com/VolticaSaS/AppVolticaSolar.git
cd AppVolticaSolar
npm install
cp .env.example .env.local
```

`DATABASE_URL` queda preparado para una integración futura con PostgreSQL. La aplicación inicial no abre conexiones ni requiere una base de datos para compilar o ejecutarse. Completa la variable únicamente cuando se implemente esa integración.

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La aplicación utiliza Next.js App Router, TypeScript, Tailwind CSS y ESLint.

## Compilación y ejecución

```bash
npm run lint
npm run build
npm start
```

`npm start` sirve el artefacto compilado en el puerto indicado por `PORT` (por defecto, 3000).

## Despliegue en Railway

1. Crea un proyecto en Railway y selecciona **Deploy from GitHub repo**.
2. Conecta `VolticaSaS/AppVolticaSolar` y elige la rama que quieras desplegar.
3. Railway detectará Node.js y `package-lock.json`; instalará dependencias con npm y ejecutará `npm run build` y `npm start` mediante los scripts del proyecto.
4. En **Variables**, configura `NODE_ENV=production` si Railway no lo establece automáticamente. No hace falta `DATABASE_URL` para esta versión.
5. Genera un dominio público en la configuración del servicio y revisa los logs de despliegue.

El proyecto declara compatibilidad con Node.js `>=20.9.0` y recomienda Node.js 22 mediante `.nvmrc`. Railway proporciona `PORT`; el servidor de Next.js lo utiliza automáticamente.

## Estructura

```text
src/
  app/                 Rutas, layout global y estilos
  components/          Componentes compartidos de interfaz
  features/solar/       Catálogo y componentes del dominio solar
  lib/                 Utilidades del servidor y futuras integraciones
  types/               Tipos compartidos
```

La estructura deja separado el dominio de soluciones solares para ampliar On-Grid, híbridos y Off-Grid con baterías sin acoplar la interfaz a una base de datos.

## Variables de entorno

Consulta `.env.example`. No incluyas secretos en el repositorio. Cuando se integre PostgreSQL, configura `DATABASE_URL` en el panel de Railway y en tu entorno local mediante `.env.local`.
