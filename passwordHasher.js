// hash-password.js
const argon2 = require('@node-rs/argon2');

async function run() {
  const plainPassword = '12345';
  try {
    const hash = await argon2.hash(plainPassword);
    console.log('Hashed Password:\n', hash);
  } catch (err) {
    console.error(err);
  }
}

run();
