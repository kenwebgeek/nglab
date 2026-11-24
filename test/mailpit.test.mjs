import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('Mailpit captures SMTP messages in its local inbox', async () => {
  const subject = `nglab-mail-test-${randomUUID()}`;
  const text = 'Local SMTP smoke test';
  const result = spawnSync('curl', [
    '--silent', '--show-error', '--fail', '--connect-timeout', '5', '--max-time', '10',
    '--url', 'smtp://127.0.0.1:1025',
    '--mail-from', 'sender@example.test',
    '--mail-rcpt', 'recipient@example.test',
    '--upload-file', '-',
  ], {
    encoding: 'utf8',
    input: `From: sender@example.test\r\nTo: recipient@example.test\r\nSubject: ${subject}\r\n\r\n${text}\r\n`,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);

  const search = await fetch(`http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`subject:${subject}`)}`);
  assert.equal(search.status, 200);
  const { messages } = await search.json();
  const message = messages.find((item) => item.Subject === subject);
  assert.ok(message, 'SMTP message was not found in the Mailpit inbox');

  try {
    const response = await fetch(`http://127.0.0.1:8025/api/v1/message/${encodeURIComponent(message.ID)}`);
    assert.equal(response.status, 200);
    const captured = await response.json();
    assert.equal(captured.To[0].Address, 'recipient@example.test');
    assert.equal(captured.Text.trim(), text);
  } finally {
    const response = await fetch('http://127.0.0.1:8025/api/v1/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDs: [message.ID] }),
    });
    assert.equal(response.status, 200);
  }
});
