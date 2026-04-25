import { AppState, type AppStateStatus } from 'react-native';

type TimerCallback = (elapsed: number) => void;
type CountdownCallback = (remaining: number) => void;

/**
 * Serviço responsável pelo cronômetro de sessão e temporizador de descanso.
 * Gerencia transições foreground/background usando AppState e Date.now().
 */
export class TimerService {
  // Cronômetro de sessão
  private cronometroInterval: ReturnType<typeof setInterval> | null = null;
  private cronometroInicio: number = 0;
  private cronometroOffset: number = 0; // tempo acumulado antes da última retomada
  private cronometroPausado: boolean = false;
  private pausaInicio: number = 0;
  private tempoPausadoTotal: number = 0;

  // Temporizador de descanso
  private descansoInterval: ReturnType<typeof setInterval> | null = null;
  private descansoFim: number = 0;
  private descansoOnTick: CountdownCallback | null = null;
  private descansoOnComplete: (() => void) | null = null;

  // Background handling
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private backgroundTimestamp: number = 0;

  // ============================================================
  // Cronômetro de sessão
  // ============================================================

  /**
   * Inicia o cronômetro de sessão.
   * @param onTick Callback chamado a cada segundo com o tempo decorrido em segundos.
   * @param initialOffset Tempo já decorrido (para recuperação de sessão).
   */
  iniciarCronometro(onTick: TimerCallback, initialOffset: number = 0): void {
    this.pararCronometro();
    this.cronometroOffset = initialOffset;
    this.cronometroInicio = Date.now();
    this.cronometroPausado = false;
    this.tempoPausadoTotal = 0;

    this.cronometroInterval = setInterval(() => {
      if (!this.cronometroPausado) {
        const elapsed = this.getTempoAtivo();
        onTick(Math.floor(elapsed));
      }
    }, 1000);

    this.setupAppStateListener(onTick);
  }

  /**
   * Pausa o cronômetro.
   */
  pausarCronometro(): void {
    if (!this.cronometroPausado) {
      this.cronometroPausado = true;
      this.pausaInicio = Date.now();
    }
  }

  /**
   * Retoma o cronômetro.
   */
  retomarCronometro(): void {
    if (this.cronometroPausado) {
      const pausaDuracao = (Date.now() - this.pausaInicio) / 1000;
      this.tempoPausadoTotal += pausaDuracao;
      this.cronometroPausado = false;
    }
  }

  /**
   * Para o cronômetro e retorna o tempo total ativo em segundos.
   */
  pararCronometro(): number {
    const tempoAtivo = this.getTempoAtivo();

    if (this.cronometroInterval) {
      clearInterval(this.cronometroInterval);
      this.cronometroInterval = null;
    }

    this.removeAppStateListener();
    this.cronometroInicio = 0;
    this.cronometroOffset = 0;
    this.cronometroPausado = false;
    this.tempoPausadoTotal = 0;

    return Math.floor(tempoAtivo);
  }

  /**
   * Calcula o tempo ativo excluindo intervalos pausados.
   */
  getTempoAtivo(): number {
    if (this.cronometroInicio === 0) return this.cronometroOffset;

    const totalDecorrido = (Date.now() - this.cronometroInicio) / 1000;
    let pausaAtual = 0;
    if (this.cronometroPausado) {
      pausaAtual = (Date.now() - this.pausaInicio) / 1000;
    }

    return this.cronometroOffset + totalDecorrido - this.tempoPausadoTotal - pausaAtual;
  }

  /**
   * Retorna o tempo total pausado em segundos.
   */
  getTempoPausado(): number {
    let pausaAtual = 0;
    if (this.cronometroPausado) {
      pausaAtual = (Date.now() - this.pausaInicio) / 1000;
    }
    return this.tempoPausadoTotal + pausaAtual;
  }

  /**
   * Retorna se o cronômetro está pausado.
   */
  estaPausado(): boolean {
    return this.cronometroPausado;
  }

  // ============================================================
  // Temporizador de descanso
  // ============================================================

  /**
   * Inicia o temporizador de descanso com contagem regressiva.
   */
  iniciarDescanso(
    segundos: number,
    onTick: CountdownCallback,
    onComplete: () => void
  ): void {
    this.cancelarDescanso();

    this.descansoFim = Date.now() + segundos * 1000;
    this.descansoOnTick = onTick;
    this.descansoOnComplete = onComplete;

    onTick(segundos);

    this.descansoInterval = setInterval(() => {
      const restante = Math.max(0, Math.ceil((this.descansoFim - Date.now()) / 1000));
      onTick(restante);

      if (restante <= 0) {
        this.cancelarDescanso();
        onComplete();
      }
    }, 1000);
  }

  /**
   * Cancela o temporizador de descanso.
   */
  cancelarDescanso(): void {
    if (this.descansoInterval) {
      clearInterval(this.descansoInterval);
      this.descansoInterval = null;
    }
    this.descansoOnTick = null;
    this.descansoOnComplete = null;
  }

  /**
   * Retorna o tempo restante de descanso em segundos, ou null se não ativo.
   */
  tempoDescansoRestante(): number | null {
    if (!this.descansoInterval) return null;
    const restante = Math.max(0, Math.ceil((this.descansoFim - Date.now()) / 1000));
    return restante;
  }

  // ============================================================
  // Background handling
  // ============================================================

  private setupAppStateListener(onTick: TimerCallback): void {
    this.removeAppStateListener();

    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          this.backgroundTimestamp = Date.now();
        } else if (nextState === 'active') {
          if (this.backgroundTimestamp > 0) {
            // Recalcular tempos ao voltar ao foreground
            if (!this.cronometroPausado && this.cronometroInicio > 0) {
              const elapsed = this.getTempoAtivo();
              onTick(Math.floor(elapsed));
            }

            // Verificar se descanso terminou em background
            if (this.descansoInterval) {
              const restante = this.tempoDescansoRestante();
              if (restante !== null && restante <= 0) {
                const onComplete = this.descansoOnComplete;
                this.cancelarDescanso();
                onComplete?.();
              } else if (restante !== null && this.descansoOnTick) {
                this.descansoOnTick(restante);
              }
            }

            this.backgroundTimestamp = 0;
          }
        }
      }
    );
  }

  private removeAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Limpa todos os timers e listeners.
   */
  destruir(): void {
    this.pararCronometro();
    this.cancelarDescanso();
    this.removeAppStateListener();
  }
}

/** Instância singleton do serviço */
export const timerService = new TimerService();
