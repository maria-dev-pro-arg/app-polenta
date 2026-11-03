# APP — cuentas opcionales (piloto v0.3)

## Estado
La app sigue funcionando sin cuenta. Firebase queda desactivado hasta configurar el proyecto.
**No está desplegada esta versión en GitHub Pages ni probada con una cuenta real.**
La sincronización es manual y conservadora: no sobrescribe registros con identificadores iguales y contenidos distintos, no elimina registros de la nube, y genera un respaldo JSON antes de empezar.
Las fotos se conservan localmente y NO se sincronizan. Una sesión en curso tampoco se sube.

## Configurar Firebase Spark
1. Entrar a https://console.firebase.google.com/ y crear un proyecto exclusivo `app-polenta` con plan Spark (sin facturación).
2. Registrar una aplicación **Web** y copiar sus parámetros de configuración públicos (`apiKey`, `authDomain`, `projectId`, `appId`) al archivo `firebase-config.js`. No usar claves privadas de servicio ni credenciales administrativas.
3. Authentication > Sign-in method > habilitar **Email/Password**.
4. Authentication > Settings > Authorized domains: agregar `maria-dev-pro-arg.github.io` si no aparece.
5. Firestore Database > Create database en modo de **producción** (no modo prueba), y pegar y publicar las reglas del archivo `firestore.rules`.
6. Probar primero con una cuenta y datos ficticios. Crear cuenta, sincronizar, cerrar sesión y comprobar que los datos locales siguen ahí.
7. En otro navegador vacío, iniciar sesión y sincronizar manualmente. Confirmar que aparecen las sesiones. Revisar que las fotos no se transfieren.
8. Conservar un respaldo JSON antes de cambiar de navegador/teléfono.

## Publicar
Subir el contenido de esta carpeta a la **raíz** del repositorio `maria-dev-pro-arg/app-polenta` (no la carpeta envolvente). El despliegue de GitHub Pages debe usar `main` y `/(root)`.
Esta entrega no se subió a GitHub: la integración conectada rechazó modificaciones con 403.

## Seguridad y límites
- Las reglas de Firestore impiden acceder al espacio de otro usuario; requieren pruebas en Firebase Rules Playground/emulador antes de uso público.
- No se guardan contraseñas en el código ni en localStorage de APP: Firebase Authentication las administra.
- Esta versión piloto no resuelve ediciones concurrentes ni borrados entre varios dispositivos. Si hay registros conflictivos, bloquea la sincronización.
- La app puede funcionar sin conexión para el entrenamiento; el inicio de sesión y la sincronización necesitan conexión.
- El proyecto Spark tiene límites de lecturas, escrituras y almacenamiento; revisar los consumos.
- Por privacidad, evitar publicidad y analítica hasta publicar política de privacidad y consentimiento apropiado.
