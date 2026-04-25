import * as Notifications from 'expo-notifications';

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Serviço responsável por notificações locais.
 * Usado para alertar o fim do temporizador de descanso em background.
 */
export class NotificacaoService {
  /**
   * Solicita permissão para enviar notificações.
   * @returns true se permissão concedida.
   */
  async solicitarPermissao(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Agenda uma notificação local para quando o descanso terminar.
   * @param emSegundos Tempo em segundos até a notificação.
   * @param exercicioNome Nome do exercício para exibir na notificação.
   * @returns ID da notificação agendada.
   */
  async agendarNotificacaoDescanso(
    emSegundos: number,
    exercicioNome: string
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱️ Descanso finalizado!',
        body: `Hora de voltar para ${exercicioNome}`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(emSegundos)),
      },
    });

    return id;
  }

  /**
   * Cancela todas as notificações pendentes.
   */
  async cancelarNotificacoesPendentes(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

/** Instância singleton do serviço */
export const notificacaoService = new NotificacaoService();
