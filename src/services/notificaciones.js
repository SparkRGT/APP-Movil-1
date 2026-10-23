import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export const CANAL_SOLICITUDES = 'default';

let moduloNotificaciones;

export function obtenerNotificaciones() {
  if (Platform.OS !== 'android') throw new Error('Esta práctica está preparada para Android.');
  if (moduloNotificaciones) return moduloNotificaciones;
  const Notifications = require('./notificacionesLocales');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  moduloNotificaciones = Notifications;
  return Notifications;
}

export async function solicitarPermisos() {
  const Notifications = obtenerNotificaciones();
  if (Platform.OS !== 'android') {
    throw new Error('Esta práctica está preparada para Android.');
  }
  // Android 13 necesita un canal antes de mostrar la petición de permiso.
  await Notifications.setNotificationChannelAsync(CANAL_SOLICITUDES, {
    name: 'Avisos de solicitudes',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
  let permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted && permiso.canAskAgain) {
    permiso = await Notifications.requestPermissionsAsync();
  }
  if (!permiso.granted) {
    throw new Error('Permiso denegado. Activa las notificaciones en los ajustes del teléfono.');
  }
}

export async function registrarDispositivo() {
  if (Constants.executionEnvironment === 'storeClient') {
    throw new Error('Expo Go permite la prueba local, pero el token push requiere una build de desarrollo con Firebase.');
  }
  if (!Device.isDevice) {
    throw new Error('Usa un Android físico para la demostración de esta práctica.');
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Falta extra.eas.projectId. Vincula el proyecto con eas init.');
  await solicitarPermisos();
  const { getExpoPushTokenAsync } = require('expo-notifications/build/getExpoPushTokenAsync');
  return (await getExpoPushTokenAsync({ projectId })).data;
}

// Reutilizar SOLO después de que la API confirme el guardado de una solicitud.
// No pide permisos en el flujo de guardado: se solicitan previamente en la pantalla.
export async function notificarSolicitudRegistrada(id) {
  const Notifications = obtenerNotificaciones();
  if (Platform.OS !== 'android') throw new Error('Notificaciones disponibles en Android.');
  const permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted) throw new Error('Primero concede permiso desde Avisos.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Solicitud registrada',
      body: 'Tu solicitud fue registrada correctamente.',
      sound: 'default',
      data: { pantalla: 'solicitudes', tipo: 'solicitud_creada', ...(id != null ? { id } : {}) },
    },
    trigger: { channelId: CANAL_SOLICITUDES },
  });
}
