# APP — A Ponerse Polenta: configuración Firebase Spark (piloto v0.5)

## Qué está implementado
- Uso sin registro y almacenamiento local sin conexión (en el dispositivo).
- Catálogo ampliado a 46 máquinas iniciales, con filtro por grupo; el catálogo nuevo se agrega una sola vez sin borrar las máquinas ya guardadas.
- Cuentas opcionales: correo y contraseña, iniciar/cerrar sesión, recuperación de contraseña.
- Sincronización **manual** de máquinas, planes y entrenamientos terminados.
- Copia de seguridad JSON local antes de sincronizar; no se sobreescribe un registro con el mismo identificador si sus datos difieren.
- Se identifican máquinas equivalentes por nombre/grupo o catalogKey, para evitar duplicados entre teléfonos.
- Las fotos y un entrenamiento en curso permanecen **solo en el dispositivo**.
- Bloqueo de sincronización si los datos locales ya están vinculados a un UID diferente.

## Lo que NO está listo
- No hay proyecto Firebase conectado: `firebase-config.js` contiene valores vacíos.
- No se probó el registro ni la sincronización real contra Firebase, ni las reglas con el emulador.
- Ediciones concurrentes en distintos celulares o borrados de registros no tienen resolución automática. Si hay conflicto, el proceso se detiene sin sobrescribirlo.
- No se implementó publicidad.

## Configurar sin habilitar facturación
1. Abrí https://console.firebase.google.com/ y creá un proyecto independiente para APP, usando **Spark**. No vincules facturación.
2. En **Project settings → General → Your apps**, registrá una **Web app** y copiá `apiKey`, `authDomain`, `projectId` y `appId` de su configuración web (son valores públicos de configuración, **no** secretos).
3. Pegá esos cuatro valores en `firebase-config.js` (en el repositorio GitHub). Nunca publiques claves de cuenta de servicio, contraseñas, tokens de administración o claves privadas.
4. En **Authentication → Sign-in method**, activá **Email/Password**.
5. En **Authentication → Settings → Authorized domains**, agregá `maria-dev-pro-arg.github.io` si no figura.
6. En **Firestore Database**, creá **una base de datos Standard en producción** (nunca modo de prueba abierto). Copiá las reglas del repositorio `firestore.rules`, revisalas en el simulador de reglas y publicalas.
7. Tras actualizar la PWA, probá con una cuenta ficticia en el celular A: exportá respaldo, registrá un entrenamiento, creá la cuenta, sincronizá.
8. En un navegador limpio B (sin datos reales), iniciá sesión y sincronizá manualmente. Comprobá que los ejercicios y pesos aparecen sin duplicar máquinas. Repetí como un usuario distinto y comprobá que no puede leer los datos del anterior.
9. Antes de pasar a uso público, validá permisos, conflictos entre dispositivos, restablecimiento de contraseña y comportamiento sin conexión.

## Seguridad y costos
- `firebase-config.js` es público; no reemplaza reglas de seguridad en Firestore.
- Mantener el proyecto en Spark. Firestore ofrece cuotas gratis y deja de atender ciertas operaciones al agotarlas; no activar servicios que requieran Blaze.
- Los datos locales aún quedan en el perfil del navegador/dispositivo. El cambio de sesión NO los elimina. APP debe usarse en un dispositivo personal; no usar múltiples cuentas en el mismo perfil para separar información confidencial.
- Evitá borrar la PWA o datos del sitio antes de exportar respaldos.
- Los usuarios de la PWA deberán revisar una política de privacidad antes del lanzamiento público, especialmente si se incorpora publicidad.
