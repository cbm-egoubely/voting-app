const fs = require('fs');
const { chromium } = require('playwright-core');

const userAgentStrings = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.2227.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.3497.92 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
];
const kikHomepageUrl = 'https://umusic.glitch.ge/kik';
const users = fs.readFileSync('users.csv').toString()
  .split('\n').filter((line) => line.trim() !== '').map((email) => email.replaceAll('\r', '').toLowerCase());
const password = 'a12345678';

let likes = 0;

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });


  for (const email of users) {
    const browserContext = await browser.newContext({
      userAgent: userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
    });

    try {
      await searchAndLike({ browserContext, email, password });
    } catch (err) {
      logError(`User ${email} failed to like.`, err.message);
    }

    await browserContext.close();
  }

  logInfo(`Total likes added: ${likes}`);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.log(error);
  process.exit(1);
});

async function searchAndLike ({ browserContext, email, password }) {
  const page = await browserContext.newPage();

  await page.goto(kikHomepageUrl);

  await page.locator('button', { hasText: 'Connexion' }).click();

  const emailInput = await page.locator('input[placeholder="E-mail"]');
  await emailInput.type(email);

  const passwordInput = await page.locator('input[placeholder="Mot de passe"]');
  await passwordInput.type(password);

  await page.locator('button', { hasText: 'Connexion' }).click();
  await page.locator('button', { hasText: 'Gang' }).click();

  let maxSteps = 25;
  while (maxSteps > 0) {
    await page.locator('button', { hasText: 'Next' }).click();

    await new Promise((r) => setTimeout(r, 500))

    const isRzThere = await page.getByText('KIK ft. R Z').isVisible();

    if (isRzThere) {
      break;
    }
    maxSteps -= 1;
  }

  if (maxSteps === 0) {
    throw new Error('Did not find RZ card in the list.');
  }

  const likeButton = await page.locator('div[class*=Card_container]:has-text("KIK ft. R Z") >> button.CardHeart_vote__WMacb');
  const likeSvg = await likeButton.locator('svg');
  const likeSvgStyleAttribute = await likeSvg.getAttribute('style');

  if (likeSvgStyleAttribute.includes('fill: transparent')) {
    await likeButton.click();

    likes += 1;
    logInfo(`User ${email} added a liked!`);

    await wait(2000);
    await page.screenshot({ path: `${process.cwd()}/proofs/proof-of-like-${email}.jpeg`, type: 'jpeg', quality: 20 });
  } else {
    logInfo(`User ${email} had already liked.`);
  }
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function logInfo(message) {
  fs.appendFileSync('logs.txt', `${new Date().toISOString()} (INFO) ${message}\n`);
}

function logError(message) {
  fs.appendFileSync('logs.txt', `${new Date().toISOString()} (ERROR) ${message}\n`);
}