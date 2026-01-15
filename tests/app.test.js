
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../src/index.html'), 'utf-8');

describe('Hello Dare Website', () => {

  beforeEach(() => {
    document.documentElement.innerHTML = html;
    // Since we are mocking the DOM, scripts won't run automatically in the same way.
    // We might need to manually trigger things if we were testing complex interactions without E2E.
    // For now, we test structure.
  });

  it('should have the correct title', () => {
    expect(document.title).toBe('HelloDare.com / Studio Dare');
  });

  it('should contain the main title "Studio Dare"', () => {
    const title = document.getElementById('main-page-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Studio Dare');
  });

  it('should have a dark mode toggle button', () => {
    const toggle = document.getElementById('darkModeToggle');
    expect(toggle).toBeTruthy();
  });

  it('should have navigation menu hidden initially', () => {
    const nav = document.getElementById('main-navigation');
    expect(nav).toBeTruthy();
    expect(nav.classList.contains('is-hidden')).toBe(true);
  });

  it('should have a work button', () => {
    const workBtn = document.getElementById('menu-toggle-btn');
    expect(workBtn).toBeTruthy();
    expect(workBtn.textContent.trim()).toBe('Work');
  });

});
