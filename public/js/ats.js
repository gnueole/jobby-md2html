/**
 * Jobby Markdown Editor - ats.js
 * ATS formatting compliance checker and validator.
 */

import { ICONS } from './config.js';
import { t } from './i18n.js';

export function runAtsChecker(md, html) {
    const charWordCount = document.getElementById('char-word-count');
    const atsChecklistContainer = document.getElementById('ats-checklist');
    const scoreRingProgress = document.getElementById('score-ring-progress');
    const scoreValueText = document.getElementById('score-value');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');

    if (!charWordCount || !atsChecklistContainer || !scoreRingProgress || !scoreValueText || !verdictTitle || !verdictDesc) {
        return;
    }

    let score = 100;
    const checks = [];

    // Textual representation of compiled HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const plainText = doc.body.textContent || "";

    // Count words/chars
    const wordCount = plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charCount = plainText.length;
    charWordCount.textContent = t('ats.words_chars', { wordCount, charCount });

    // 1. Email Check
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailRegex.test(plainText)) {
        checks.push({ status: 'pass', text: t('ats.rule_email_pass') });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_email_fail') });
    }

    // 2. Phone Check
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/;
    if (phoneRegex.test(plainText)) {
        checks.push({ status: 'pass', text: t('ats.rule_phone_pass') });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_phone_fail') });
    }

    // 3. Tables Warning (ATS parsing blocker)
    if (md.includes('| --- |') || html.includes('<table')) {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_tables_fail') });
    } else {
        checks.push({ status: 'pass', text: t('ats.rule_tables_pass') });
    }

    // 4. Image Check
    if (md.includes('![]') || md.includes('![') || html.includes('<img')) {
        score -= 10;
        checks.push({ status: 'fail', text: t('ats.rule_images_fail') });
    } else {
        checks.push({ status: 'pass', text: t('ats.rule_images_pass') });
    }

    // 5. Headings Check
    const standardHeaders = ['experience', 'education', 'formation', 'skills', 'competenc', 'project', 'projet', 'summary', 'profile', 'profil', 'resume', 'résumé'];
    const headers = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.toLowerCase());
    let standardHeadingCount = 0;
    headers.forEach(h => {
        if (standardHeaders.some(sh => h.includes(sh))) {
            standardHeadingCount++;
        }
    });

    if (standardHeadingCount >= 2) {
        checks.push({ status: 'pass', text: t('ats.rule_headings_pass') });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_headings_fail') });
    }

    // 6. Candidates full name check (First Heading should be candidate name)
    const firstHeader = doc.querySelector('h1');
    if (firstHeader && firstHeader.textContent.trim().length > 2) {
        checks.push({ status: 'pass', text: t('ats.rule_name_pass') });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_name_fail') });
    }

    // 7. Bullet points formatting check
    const lists = doc.querySelectorAll('li');
    if (lists.length >= 3) {
        checks.push({ status: 'pass', text: t('ats.rule_bullets_pass') });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: t('ats.rule_bullets_fail') });
    }

    // Ensure score bounds
    score = Math.max(0, Math.min(100, score));

    // Render checklist UI
    atsChecklistContainer.innerHTML = checks.map(c => {
        const iconKey = c.status === 'pass' ? 'check' : (c.status === 'fail' ? 'error' : 'info');
        const icon = iconKey === 'check' ? ICONS.check : (iconKey === 'error' ? ICONS.error : ICONS.info);
        return `<li class="${c.status}">${icon} <span>${c.text}</span></li>`;
    }).join('');

    // Update radial progress circle
    const circumference = 163.36;
    const offset = circumference - (score / 100) * circumference;
    scoreRingProgress.style.strokeDashoffset = offset;
    scoreValueText.textContent = `${score}%`;

    // Style score indicators based on score
    if (score >= 90) {
        scoreRingProgress.setAttribute('stroke', '#10b981'); // success green
        verdictTitle.textContent = t('ats.verdict_pass');
        verdictDesc.textContent = t('ats.desc_pass');
    } else if (score >= 70) {
        scoreRingProgress.setAttribute('stroke', '#fbbf24'); // warning yellow
        verdictTitle.textContent = t('ats.verdict_warn');
        verdictDesc.textContent = t('ats.desc_warn');
    } else {
        scoreRingProgress.setAttribute('stroke', '#ef4444'); // danger red
        verdictTitle.textContent = t('ats.verdict_fail');
        verdictDesc.textContent = t('ats.desc_fail');
    }
}
