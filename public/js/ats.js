/**
 * Jobby Markdown Editor - ats.js
 * ATS formatting compliance checker and validator.
 */

import { ICONS } from './config.js';

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
    charWordCount.textContent = `Words: ${wordCount} | Characters: ${charCount}`;

    // 1. Email Check
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailRegex.test(plainText)) {
        checks.push({ status: 'pass', text: 'Valid email address present.' });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: 'No email address detected.' });
    }

    // 2. Phone Check
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/;
    if (phoneRegex.test(plainText)) {
        checks.push({ status: 'pass', text: 'Phone number present.' });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: 'No phone number detected.' });
    }

    // 3. Tables Warning (ATS parsing blocker)
    if (md.includes('| --- |') || html.includes('<table')) {
        score -= 15;
        checks.push({ status: 'fail', text: 'Table detected: Avoid tables (ATS scanners read table cells out of order).' });
    } else {
        checks.push({ status: 'pass', text: 'Table-free structure (Compliant).' });
    }

    // 4. Image Check
    if (md.includes('![]') || md.includes('![') || html.includes('<img')) {
        score -= 10;
        checks.push({ status: 'fail', text: 'Image detected: Avoid graphics/images (ATS scanners ignore images and text inside them).' });
    } else {
        checks.push({ status: 'pass', text: 'No graphics/images (Compliant).' });
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
        checks.push({ status: 'pass', text: 'Standard section headings identified.' });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: 'Use standard section headings (e.g., "Experience", "Education").' });
    }

    // 6. Candidates full name check (First Heading should be candidate name)
    const firstHeader = doc.querySelector('h1');
    if (firstHeader && firstHeader.textContent.trim().length > 2) {
        checks.push({ status: 'pass', text: 'Candidate full name identified in H1.' });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: 'Start your resume with your Name in H1.' });
    }

    // 7. Bullet points formatting check
    const lists = doc.querySelectorAll('li');
    if (lists.length >= 3) {
        checks.push({ status: 'pass', text: 'Standardized bullet point structure.' });
    } else {
        score -= 15;
        checks.push({ status: 'fail', text: 'Use bullet point lists (at least 3 items) for professional experience.' });
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
        verdictTitle.textContent = "Perfect Formatting!";
        verdictDesc.textContent = "Ready to be parsed by recruiters and ATS scanners.";
    } else if (score >= 70) {
        scoreRingProgress.setAttribute('stroke', '#fbbf24'); // warning yellow
        verdictTitle.textContent = "Average Formatting";
        verdictDesc.textContent = "Fix critical warnings to optimize parsing.";
    } else {
        scoreRingProgress.setAttribute('stroke', '#ef4444'); // danger red
        verdictTitle.textContent = "Optimization Required";
        verdictDesc.textContent = "Your resume may not be parsed correctly by ATS.";
    }
}
