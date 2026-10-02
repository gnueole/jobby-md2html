I want to import my CV into Jobby, a Markdown resume editor. Export it as Markdown that follows these rules exactly.

Source: use the CV we built together in this conversation. If there is none, ask me to paste it here before you continue.

Layout rules:
- First line: "# " followed by my full name, once.
- Right below: my target job title in bold, for example: **Solutions Engineer** :accent[· Available immediately]
- Then one contact line, between square brackets, values separated by " • ", and it must end with "]":
  [CONTACT : my.email@example.com • +33 6 00 00 00 00 • [linkedin.com/in/my-profile](https://www.linkedin.com/in/my-profile)]
- Then my summary (2 to 3 sentences) as a quote: a single line starting with "> "
- "## " before each main section (Experience, Projects, Education…)
- "### " only before short side sections (Skills, Languages, Interests…): Jobby places them in a sidebar column. Never use "###" for a job or a degree.
- Each job or degree on one bold line: **Job Title** - Company :muted[· City, Country] - 2022 - Present
- Under it, "- " bullets that start with an action verb and give a measurable result whenever possible.
- :accent[…] to highlight a few key words and :muted[…] for secondary details, both sparingly.
- No table, no image, no emoji, no HTML.

Content rules:
- Invent nothing: keep only what I provided.
- If essential information is missing (dates, job title), list it at the end rather than guessing.
- Write in the same language as my CV.

Output: put the whole CV in a single markdown code block, with no text before it, so I can copy it in one click and paste it straight into Jobby. After the block, list any missing information in one line.
