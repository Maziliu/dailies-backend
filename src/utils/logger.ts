const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK!;

export enum LOG_LEVEL {
  SUCCESS,
  ERROR
}

export async function log(message: string, level: LOG_LEVEL = LOG_LEVEL.SUCCESS) {
  const embedColour = level === LOG_LEVEL.SUCCESS ? 0x57f287 : 0xed4245;

  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          description: message,
          color: embedColour
        }
      ]
    })
  });
}
