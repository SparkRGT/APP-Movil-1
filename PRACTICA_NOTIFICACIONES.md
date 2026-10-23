# Práctica de notificaciones push en Android

## Trabajo implementado

La pantalla `src/Screen/NotificacionesPush.jsx` se abre desde **Avisos** después del login. Conserva los avisos recibidos al cambiar de pestaña, muestra el estado de las operaciones y registra la última notificación pulsada, incluso al abrir la aplicación desde una notificación.

El servicio `src/services/notificaciones.js` configura la presentación en primer plano, crea el canal Android antes de solicitar permisos, obtiene el token Expo y emite la notificación local. El token está oculto parcialmente por defecto; utiliza **Mostrar token para copiar** solamente para la prueba y vuelve a ocultarlo antes de capturar la pantalla.

`app.json` conserva las opciones anteriores, añade el plugin `expo-notifications` y fija el paquete Android `com.spaekrgt.appmovil1`. El ID de EAS existente se conserva. El perfil development de `eas.json` produce una APK interna.

## Prueba local

1. Ejecuta `npx expo start` y abre el proyecto en Android.
2. Inicia sesión con las credenciales de prueba existentes: `spark@cliente.com` / `12345`.
3. Abre **Avisos**, pulsa **Solicitar permisos** y acepta el permiso del sistema.
4. Pulsa **Probar notificación local**. Debe aparecer “Solicitud registrada”. Este botón es una prueba y no guarda datos.
5. Pulsa el aviso en la bandeja para comprobar el campo **Último aviso pulsado**.
6. Si deniegas el permiso, la pantalla muestra el error. Usa **Abrir ajustes del teléfono** para habilitarlo y vuelve a probar.

La prueba local no demuestra el funcionamiento de push remoto. Las pruebas en el teléfono y sus capturas deben realizarse con el dispositivo real.

## Firebase y build pendientes

El usuario confirmó que todavía no dispone de Firebase ni de una API de solicitudes. No se han creado credenciales, realizado compilaciones en EAS ni enviado notificaciones remotas.

1. En https://console.firebase.google.com crea un proyecto y agrega una aplicación Android con el paquete **com.spaekrgt.appmovil1**, exactamente igual a `app.json`.
2. Descarga `google-services.json` y colócalo en la raíz. Después agrega `"googleServicesFile": "./google-services.json"` dentro de `expo.android` en `app.json`, junto a `package` y `adaptiveIcon`. No agregues la ruta antes de que exista el archivo.
3. En Firebase → Configuración del proyecto → Cuentas de servicio, genera la clave privada para FCM V1. Guarda esa clave fuera del repositorio; es distinta de `google-services.json`.
4. Ejecuta `eas whoami` para verificar la cuenta ya iniciada. Ejecuta `eas credentials`, selecciona Android y la administración de Google Service Account para Push Notifications (FCM V1); carga la clave privada con el asistente.
5. Ejecuta `eas build --platform android --profile development`. Instala la APK del enlace de EAS en el teléfono.
6. Ejecuta `npx expo start --dev-client` y abre la build instalada.
7. En **Avisos**, concede permisos y pulsa **Obtener token Expo**.
8. Abre https://expo.dev/notifications y copia el token completo de forma privada. Envía el título “Solicitud aprobada” y el texto “Tu solicitud fue revisada”, con sonido default y canal `default` si la herramienta ofrece esa opción.
9. Repite con la aplicación en primer plano y en segundo plano. Pulsa el aviso para verificar la interacción. Si cambias Firebase o plugins, debes generar otra build.

La cuenta de servicio privada se carga en EAS; nunca se importa desde el código móvil. El archivo `.gitignore` excluye nombres habituales de credenciales. Conserva cualquier clave privada fuera del proyecto aunque tenga otro nombre.

## Integración grupal pendiente de una API real

Este proyecto tiene perfil, catálogo y carrito, pero no tiene un endpoint para registrar solicitudes. No se simula un guardado exitoso. Cuando exista ese flujo, importa `notificarSolicitudRegistrada` del servicio y llámala después de comprobar el éxito del servidor.

```js
// Dentro del manejador real, después de validar los datos y ejecutar el guardado:
if (!respuesta.ok) {
  throw new Error('No se pudo guardar la solicitud');
}
const solicitud = await respuesta.json();
// El guardado ya tuvo éxito; un fallo de notificación no debe repetirlo.
try {
  await notificarSolicitudRegistrada(solicitud.id);
} catch {
  Alert.alert('Solicitud guardada', 'No se pudo mostrar el aviso. Revisa los permisos en Avisos.');
}
```

Adapta `respuesta.ok` al cliente HTTP utilizado y a su contrato. Solicita permisos previamente desde Avisos. No emitas una notificación de confirmación en el catch del guardado ni antes de su respuesta exitosa.

## Preparación para la sustentación

- `getPermissionsAsync` consulta el permiso actual sin mostrar un diálogo.
- `requestPermissionsAsync` pide autorización al usuario cuando el sistema permite solicitarla.
- `setNotificationChannelAsync` define el canal Android, su importancia, sonido y vibración.
- `getExpoPushTokenAsync({ projectId })` registra el destino asociado al proyecto EAS. Requiere conectividad y configuración nativa adecuada.
- `scheduleNotificationAsync` genera el aviso local desde el propio dispositivo. El servicio usa un trigger inmediato asociado al canal `default`.
- `setNotificationHandler` permite presentar el aviso mientras la aplicación está en primer plano.
- Los listeners distinguen recepción e interacción. Sus suscripciones se eliminan al desmontar el componente.
- Ruta de una push: herramienta o servidor → Expo Push Service → Firebase Cloud Messaging → Android. Una aceptación de Expo no garantiza entrega; se revisan tickets y receipts para diagnosticarla.

## Diagnóstico y evidencias

Error observado en el teléfono: `Cannot find native module 'ExpoTopicSubscriptionModule'` al abrir desde Expo Go. La entrada general de expo-notifications SDK 57 carga ese módulo de topics incluso sin usar esa función. La primera comprobación impedía el cierre, pero bloqueaba también los avisos locales. Se corrigió con `src/services/notificacionesLocales.js`, que importa únicamente los módulos de permisos, canales, presentación y eventos locales. El token remoto se carga por separado, solo fuera de Expo Go. Este adaptador usa rutas internas de expo-notifications 57.0.x y debe revisarse al actualizar esa dependencia. Reiniciar Metro con `npx expo start --go --clear` y usar Expo Go para SDK 57. La prueba local todavía debe confirmarse en el dispositivo.

Hallazgo real al revisar la configuración: faltaban el plugin de notificaciones y el identificador Android; se añadieron sin reemplazar la configuración existente. Todavía falta Firebase, por lo que no se afirma que la push remota funcione.

Validaciones de fallo para ejecutar en el teléfono: denegar permiso y recuperarlo desde Ajustes; intentar obtener token en Expo Go y comprobar el mensaje que pide una build de desarrollo. Registra únicamente el resultado que observes, su causa y cómo lo resolviste.

Capturas pendientes: permiso del sistema, aviso local, token parcialmente oculto y push remota recibida. No incluyas claves privadas ni el token completo. Esta práctica no requiere video.

## Referencias

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- Configuración FCM V1: https://docs.expo.dev/push-notifications/fcm-credentials/
- Envío remoto: https://docs.expo.dev/push-notifications/sending-notifications/
