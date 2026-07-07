import { device, element, by, expect } from 'detox';

describe('SafarPlug E2E App Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should go through login, map search, and trip planning flows', async () => {
    // 1. Splash Redirects to Login
    await expect(element(by.text("Welcome Back 👋"))).toBeVisible();

    // 2. Login Flow
    const emailInput = element(by.id('email-input'));
    const passwordInput = element(by.id('password-input'));
    const loginButton = element(by.text('Sign In'));

    await emailInput.replaceText('driver@safarplug.com');
    await passwordInput.replaceText('password123');
    await loginButton.tap();

    // Should navigate to Home Map Screen
    await expect(element(by.text('Find Chargers'))).toBeVisible();

    // 3. Search Stations
    const searchBar = element(by.text('Search stations'));
    await expect(searchBar).toBeVisible();
    await searchBar.tap();

    // 4. Trip Planner Navigation
    const plannerTab = element(by.text('Planner'));
    await expect(plannerTab).toBeVisible();
    await plannerTab.tap();

    // 5. Route planning inputs
    const fromInput = element(by.id('starting-point-input'));
    const toInput = element(by.id('destination-input'));
    const planButton = element(by.text('⚡ Plan My Trip'));

    await fromInput.replaceText('Connaught Place, New Delhi');
    await toInput.replaceText('Sector 62, Noida');
    await planButton.tap();

    // Verify route calculated timeline is shown
    await expect(element(by.text('Route Timeline'))).toBeVisible();
  });
});
