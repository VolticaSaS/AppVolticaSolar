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
- `npm run db:status` y `npm run db:deploy` son comandos manuales con barreras de entorno y base; las migraciones nunca se ejecutan al iniciar Next.js.

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

1. En el entorno **Development**, confirma que `db_voltica_solar` existe. En el editor SQL de Railway, selecciona explícitamente esa base y verifica `SELECT current_database();`; el editor puede abrir inicialmente `railway`.
2. En Variables del servicio `AppVolticaSolar` en **Development**, configura `DATABASE_URL` con los datos administrados del servicio `Postgres` y la conexión privada. Conserva host privado, usuario, contraseña, puerto y parámetros; el componente de ruta debe terminar en `/db_voltica_solar`. Guarda la URI únicamente como variable administrada en Railway, nunca en Git, tickets o logs. No cambies `POSTGRES_DB`, `PGDATABASE` ni el volumen de Postgres.
3. Despliega en Development la revisión que contiene `scripts/db-migrate.ts`. El comando rechaza cualquier servicio/entorno distinto de `AppVolticaSolar`/`Development`, comprueba en vivo `SELECT current_database()` y exige exactamente `db_voltica_solar` antes de invocar Prisma. El mismo `DATABASE_URL` se usa para el preflight PostgreSQL, Prisma Migrate y el cliente de la aplicación.

### Base nueva

1. Revisa las tres migraciones SQL y crea un respaldo restaurable de PostgreSQL Development.
2. Abre una shell en la instancia desplegada de `AppVolticaSolar` en Development (requiere Railway CLI/SSH habilitado; el servicio PostgreSQL sigue privado). Desde una terminal autenticada y vinculada al proyecto, ejecuta primero:

   ```bash
   railway ssh --environment Development --service AppVolticaSolar -- npm run db:status
   ```

   Código de salida `0` significa historia sincronizada; `2` indica migraciones pendientes, sin modificar la base. Divergencias, migraciones fallidas o tablas Voltica existentes sin historia Prisma detienen la operación.
3. Solo tras revisar el estado y aprobar el respaldo, ejecuta una única vez:

   ```bash
   railway ssh --environment Development --service AppVolticaSolar -- npm run db:deploy
   ```

   El wrapper vuelve a consultar `current_database()` antes de ejecutar Prisma, muestra el resultado de `migrate deploy` sin mostrar la URL, y al final confirma las tablas de `public`/`internal` y las tres entradas terminadas de `_prisma_migrations`. No está configurado en el inicio ni en el comando normal de despliegue.
4. Si todo termina correctamente, conserva el log como registro y luego realiza el bootstrap administrativo solo mediante su procedimiento separado y seguro.

### Base con v1 ya instalada

1. Confirma que la estructura y los datos corresponden exactamente a `prisma/legacy/schema-v1.prisma` y al SQL v1 de referencia. El wrapper se detiene si encuentra tablas de negocio sin `_prisma_migrations`; no se debe intentar ejecutar la baseline sobre tablas existentes. Respalda la base y ensaya la actualización sobre una copia restaurada. La migración v2 conserva el análisis financiero histórico en el esquema interno, copia los costos existentes al esquema `internal` y convierte potencias de W a kW. El costo de catálogo v1 se transfiere a `internal.equipment_costs` antes de retirar su columna pública. La migración v3 renombra las tablas/columnas v2 al español y renombra índices, claves y restricciones sin eliminar filas.
2. Si v1 se creó previamente sin historial Prisma, el wrapper detendrá la operación al detectar tablas sin historial. No ejecutes directamente `prisma migrate resolve`: primero solicita una reconciliación revisada con el DBA, valida que todas las tablas, columnas y restricciones coinciden con la baseline en una sesión conectada a `db_voltica_solar`, y registra la baseline solo después de esa comprobación. `migrate resolve` registra historial y no ejecuta el archivo baseline.
3. Si ya se aplicó v2, `db:status` debe mostrar únicamente v3 pendiente y `db:deploy` aplicará esa migración incremental. Si existe historial parcial, tablas creadas con SQL manual u otra diferencia, detente y reconcilia el historial/esquema con revisión humana antes de `db:deploy`. No marques migraciones como aplicadas sin verificar el estado real.

`db:deploy` altera la base indicada por `DATABASE_URL`. El guard también requiere las variables Railway `RAILWAY_ENVIRONMENT_NAME=Development` y `RAILWAY_SERVICE_NAME=AppVolticaSolar`, además de que PostgreSQL confirme el nombre de base correcto. No ejecutes este comando desde Production. La compilación y los comandos de inicio normales no despliegan migraciones automáticamente.

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
