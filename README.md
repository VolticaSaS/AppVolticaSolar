# Voltica Solar

Aplicación empresarial para dimensionamiento técnico y simulaciones preliminares de sistemas fotovoltaicos On-Grid, híbridos y Off-Grid. La aplicación se encuentra en preparación; los resultados de cálculo no son un diseño certificado.

## Requisitos

- Node.js `>=20.19.0` (Railway o Node.js 22 LTS recomendado).
- npm 10 o superior.
- PostgreSQL para las funciones de autenticación y persistencia. No hace falta conectar una base de datos para instalar paquetes, generar Prisma Client, validar el esquema o compilar.

## Instalación local

```bash
npm install
cp .env.example .env.local
```

Configura `DATABASE_URL` en `.env.local` cuando tengas una base local. No subas `.env.local`, tokens ni credenciales a Git. `.env.example` solo contiene nombres de variables vacíos.

## Desarrollo y validación

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run build` genera Prisma Client y compila Next.js. No conecta ni migra la base de datos. `npm run db:validate` valida el esquema y `npm run db:generate` genera el cliente; ambos pueden ejecutarse sin una conexión real.

## Modelo de datos y políticas

- `prisma/schema.prisma` es el esquema vigente y separa `public` e `internal`. Los modelos Prisma conservan nombres de código en inglés; todas las tablas y columnas físicas usan `@@map`/`@map` con snake_case en español y sin tildes. Las tablas de negocio usan el prefijo `tb_`; índices, únicos y claves foráneas usan `idx_`, `uq_` y `fk_` cuando aplica.
- La base de datos esperada se llama `db_voltica_solar`. El nombre de la base no se cambia con `@@map`, Prisma ni `DATABASE_URL`: debe existir en PostgreSQL y la URL debe apuntar a ella.
- `prisma/legacy/schema-v1.prisma` documenta el esquema anterior usado como referencia para datos existentes.
- `prisma/migrations/20261011090000_v1_baseline` crea el esquema v1 con nomenclatura física en español, restricciones, índices y triggers adicionales.
- `prisma/migrations/20261011100000_v2_auth_and_finance` actualiza v1 a v2 y agrega autenticación, sesiones, pertenencias, estimaciones autorizadas y finanzas internas.
- `prisma/migrations/20261012110000_spanish_physical_identifiers` renombra de forma incremental las tablas, columnas, índices y restricciones físicas a la convención española; conserva la historia v1/v2 y no elimina filas.
- Costos de adquisición y análisis financieros viven en `internal`; las respuestas de operador usan DTOs con campos permitidos explícitos.
- Un operador consulta solo proyectos propios/asignados y precio total COP autorizado. Ingeniería puede revisar datos técnicos asignados, pero no costos ni márgenes. Administración gestiona usuarios y finanzas.
- La auditoría registra actor, acción y entidad; no incluye cuerpos de solicitudes ni valores financieros.
- Contraseñas locales usan Argon2id. Las sesiones usan tokens aleatorios opacos almacenando solo su hash, cookie HttpOnly, SameSite=Lax, Secure en producción y caducidad de ocho horas.

## Primer administrador

No se crea ningún usuario por defecto. El bootstrap se ejecuta una sola vez contra una base ya migrada y solo si todavía no existe un administrador:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@tu-dominio.example \
BOOTSTRAP_ADMIN_PASSWORD='una-frase-aleatoria-de-al-menos-16-caracteres' \
npm run admin:bootstrap
```

También acepta `BOOTSTRAP_ADMIN_NAME`. Introduce las variables desde un gestor de secretos o el entorno seguro del servicio; no las guardes en Git ni en archivos persistentes. El script no imprime la contraseña, marca la cuenta para cambio de contraseña y falla si ya existe un admin o el correo está ocupado. Retira las variables de bootstrap del entorno tras usarlo.

## Railway: preparar PostgreSQL y migraciones

La rama debe configurarse para desplegar con `npm run build` y `npm start`. En Variables del servicio web referencia `DATABASE_URL` del servicio PostgreSQL de Railway (no copies la URI al repositorio). Para usar la base **Railway Development**, confirma primero que el servicio y la variable apunten al entorno Development.

Las migraciones de este repositorio son versionadas y se ejecutan exclusivamente con Prisma Migrate. No uses `prisma db push` ni ejecutes manualmente el SQL de estas migraciones.

### Nombre de base y conexión Railway

1. En el entorno **Development**, crea o provisiona una base PostgreSQL llamada `db_voltica_solar`. Si el servicio PostgreSQL actual usa un volumen persistente con otra base, crea una base separada mediante el mecanismo soportado por Railway/PostgreSQL o un servicio PostgreSQL nuevo. No cambies `POSTGRES_DB` en un volumen existente: esa variable no renombra de forma segura la base ya inicializada y puede dejar el servicio apuntando a otro estado.
2. En el servicio web, configura `DATABASE_URL` como referencia a la conexión privada de PostgreSQL cuando ambos servicios estén en la misma red privada de Railway. Conserva usuario, contraseña, host, puerto y parámetros SSL/query existentes; actualiza solo el nombre de base al final de la ruta a `/db_voltica_solar`. No copies ni publiques la URI. Si Railway entrega una conexión distinta al crear la base, usa la referencia generada por Railway y verifica que su ruta nombre `db_voltica_solar`.
3. Comprueba el entorno y nombre destino de `DATABASE_URL` antes de cualquier comando de migración. El `.env.example` no incluye valores reales.

### Base nueva

1. Revisa y aprueba las tres migraciones `migration.sql`.
2. Haz un respaldo de la base PostgreSQL de Railway Development.
3. En un terminal/servicio que tenga la referencia `DATABASE_URL` de Development, ejecuta `npm run db:deploy`. Este comando aplica primero la baseline v1 y luego la actualización v2.
4. Prisma aplica en orden la baseline, la actualización v2 y los renombres v3. Revisa la tabla `_prisma_migrations`, valida los nombres/tablas y después ejecuta el bootstrap de administrador de forma controlada.

### Base con v1 ya instalada

1. Confirma que la estructura y los datos corresponden exactamente a `prisma/legacy/schema-v1.prisma` y al SQL v1 de referencia. La estructura actual de Railway no se ha inspeccionado como parte de este cambio. Respalda la base y ensaya la migración sobre una copia restaurada. La migración v2 conserva el análisis financiero histórico en el esquema interno, copia los costos existentes al esquema `internal` y convierte potencias de W a kW. La migración v3 renombra las tablas/columnas v2 al español, también mueve el histórico legado a `internal.tb_analisis_financieros_legacy_v1`, y renombra índices, claves y restricciones sin eliminar filas.
2. Si v1 se creó previamente sin historial Prisma, registra la baseline como ya aplicada (esto solo registra historial; no ejecuta el archivo baseline):

   ```bash
   npx prisma migrate resolve --applied 20261011090000_v1_baseline
   npm run db:deploy
   ```

3. Si ya se aplicó v2, `npm run db:deploy` aplicará solo la migración incremental de nomenclatura. Si existe historial parcial, tablas creadas con SQL manual u otra diferencia, detente y reconcilia el historial/esquema con revisión humana antes de `db:deploy`. No marques migraciones como aplicadas sin verificar el estado real.

`db:deploy` altera la base indicada por `DATABASE_URL`. No se ha ejecutado ninguna migración ni se ha eliminado o renombrado ninguna base. Se requiere autorización explícita antes de ejecutar migraciones contra Railway Development. La compilación y los comandos de validación no despliegan migraciones automáticamente.

### Rollback

Prisma Migrate no revierte automáticamente migraciones ya aplicadas. Antes de migrar, conserva un respaldo restaurable. Si falla la actualización, no borres tablas ni apliques SQL improvisado: detén el despliegue, restaura el snapshot probado o prepara una migración compensatoria revisada que preserve los datos y pruébala en una copia.

## Estructura

```text
prisma/                 Esquema, baseline, actualización y seed demostrativo
scripts/                Bootstrap manual y seguro del primer administrador
src/app/api/            Endpoints con autenticación y autorización de servidor
src/lib/auth/           Sesiones y guards
src/lib/rbac/           Permisos por rol y pruebas
src/lib/data/           Consultas y DTOs explícitos
src/features/           Funcionalidades de dominio e interfaz
```

El seed opcional `prisma/seed.ts` solo crea parámetros demostrativos no financieros; nunca crea usuarios. No ejecutes migraciones en producción desde este cambio.
