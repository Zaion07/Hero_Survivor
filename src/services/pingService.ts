import { socket } from './socket';

// =============================================================
//  pingService — mede a latência (ping) contra o servidor
//  socket.io usando um echo simples com ack ("pingCheck").
//  Só é importado no modo online, então a conexão socket.io
//  só é aberta quando o jogador entra no Battle Royale.
// =============================================================

const INTERVAL_MS = 2000;
const TIMEOUT_MS  = 4000;

/**
 * Inicia a medição periódica de ping.
 * @param onPing recebe o ping em ms, ou null se offline/sem resposta.
 * @returns função para parar a medição.
 */
export function startPingMonitor(onPing: (ms: number | null) => void): () => void {
  let stopped = false;

  const measure = (): void => {
    if (stopped) return;

    if (!socket.connected) {
      onPing(null);
      return;
    }

    const start = performance.now();

    socket.timeout(TIMEOUT_MS).emit('pingCheck', (err: unknown) => {
      if (stopped) return;
      onPing(err ? null : Math.round(performance.now() - start));
    });
  };

  measure();
  const id = window.setInterval(measure, INTERVAL_MS);

  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}
