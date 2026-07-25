/**
 * Shared helpers for turning AI-generated / form data into safe LaTeX text
 * and filling the JAIN templates.
 *
 * How the fill works
 * -------------------
 * Both JAIN_Post_Event_Report_Template.tex and event_proposal_template.tex
 * define a single macro:
 *
 *   \newcommand{\PH}[1]{{\ttfamily\small\{\{#1\}\}}}
 *
 * ...and every placeholder in the document, including inside the semantic
 * \newcommand definitions (\EventName, \Description, etc.), is written as
 * the literal source text `\PH{TOKEN}`. Because of that, we don't need to
 * touch LaTeX macro expansion at all — we can do ONE pass of literal
 * string replacement over the raw .tex source, swapping every
 * `\PH{TOKEN}` for the real (escaped) value. Any \newcommand that wrapped
 * that token now just expands to hardcoded text, and every place in the
 * body that calls the semantic macro picks up the real value for free.
 *
 * Tokens with no data available are deliberately left as `\PH{TOKEN}` so
 * the compiled PDF still shows a visible {{TOKEN}} placeholder rather than
 * silently going blank — that's a signal to fill it in manually (e.g. logo,
 * QR code, club head signature).
 */

export type TokenMap = Record<string, string | undefined | null>;

/** Escape LaTeX special characters so arbitrary user/AI text is safe to inject. */
export function escapeLatex(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);

  // Backslash must be escaped first, before we introduce any new backslashes.
  let out = str.replace(/\\/g, '\\textbackslash{}');

  const replacements: Array<[RegExp, string]> = [
    [/&/g, '\\&'],
    [/%/g, '\\%'],
    [/\$/g, '\\$'],
    [/#/g, '\\#'],
    [/_/g, '\\_'],
    [/\{/g, '\\{'],
    [/\}/g, '\\}'],
    [/~/g, '\\textasciitilde{}'],
    [/\^/g, '\\textasciicircum{}'],
  ];
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }

  // Paragraph breaks -> blank line (parskip handles spacing).
  out = out.replace(/\r\n/g, '\n');
  out = out.replace(/\n{2,}/g, '\n\n');
  // Single line breaks -> hard LaTeX line break.
  out = out.replace(/([^\n])\n(?!\n)/g, '$1\\\\\n');

  return out;
}

/**
 * Extract all placeholder tokens from a LaTeX template.
 * Returns an array of unique placeholder names (without the \PH{} wrapper).
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders = new Set<string>();
  
  // Match \PH{TOKEN} patterns, handling escaped underscores
  const phRegex = /\\PH\{([^}]+)\}/g;
  let match;
  while ((match = phRegex.exec(template)) !== null) {
    // Normalize the token name: convert escaped underscores back to regular underscores
    const token = match[1].replace(/\\_/g, '_');
    placeholders.add(token);
  }
  
  return Array.from(placeholders);
}

/**
 * Validate that all required placeholders are present in the provided tokens.
 * Some placeholders are optional (photos, certain links, resource person) and can have fallback values.
 * Throws an error if any required placeholder is missing.
 */
export function validatePlaceholders(required: string[], provided: TokenMap): void {
  // No placeholders are optional - AI will generate all required values
  const missing = required.filter(token => {
    const value = provided[token];
    return value === undefined || value === null || value === '';
  });
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required placeholders:\n${missing.map(p => `  - ${p}`).join('\n')}\n` +
      `The AI must generate values for all placeholders. Generate realistic fake values if data is not provided.`
    );
  }
}

/**
 * Validate that no placeholders remain in the filled template.
 * All placeholders must be replaced - AI generates all required values.
 * Throws an error if any \PH{...} patterns are found.
 */
export function validateTemplateReplacement(filled: string): void {
  const remaining = filled.match(/\\PH\{[^}]+\}/g);
  if (remaining && remaining.length > 0) {
    const uniqueRemaining = Array.from(new Set(remaining));
    throw new Error(
      `Template validation failed. The following placeholders were not replaced:\n${uniqueRemaining.map(p => `  - ${p}`).join('\n')}\n` +
      `Ensure all placeholders are properly replaced before compilation. AI should generate all required values.`
    );
  }
  
  // Also check for {{...}} patterns
  const braces = filled.match(/\{\{[^}]+\}\}/g);
  if (braces && braces.length > 0) {
    const uniqueBraces = Array.from(new Set(braces));
    throw new Error(
      `Template validation failed. The following brace patterns remain:\n${uniqueBraces.map(p => `  - ${p}`).join('\n')}\n` +
      `Ensure all placeholders are properly replaced before compilation.`
    );
  }
}

/**
 * Replace every `\PH{TOKEN}` in `template` whose TOKEN is a key in `tokens`
 * with the escaped value. This function handles the template's two-layer structure:
 * 1. \newcommand{\CommandName}{\PH{TOKEN}} - command definitions
 * 2. \PH{TOKEN} - direct placeholder usage
 * 
 * The template uses escaped underscores (TOKEN\_NAME) which must be handled correctly.
 * 
 * @throws Error if any required placeholder is missing or if replacement fails.
 */
export function fillPlaceholders(template: string, tokens: TokenMap): string {
  let filled = template;
  
  // Step 1: Extract all required placeholders from the template
  const requiredPlaceholders = extractPlaceholders(template);
  
  // Step 2: Validate that all required placeholders are provided
  validatePlaceholders(requiredPlaceholders, tokens);
  
  // Step 3: Replace \newcommand{\CommandName}{\PH{TOKEN}} with actual values
  // This handles the template's command definitions
  for (const [key, value] of Object.entries(tokens)) {
    if (value === undefined || value === null || value === '') {
      continue; // Skip empty values - validation should have caught this
    }
    
    const escaped = escapeLatex(value);
    
    // Replace command definitions with escaped underscores: \newcommand{\CommandName}{\PH{TOKEN\_NAME}}
    const escapedKey = key.replace(/_/g, '\\_');
    const commandPattern = new RegExp(
      `(\\\\newcommand\\{\\\\([A-Z][a-zA-Z]*)\\}\\{\\\\PH\\{${escapedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\})`,
      'g'
    );
    
    filled = filled.replace(commandPattern, (match, fullMatch, commandName) => {
      return `\\newcommand{\\${commandName}}{${escaped}}`;
    });
  }
  
  // Step 4: Replace any remaining direct \PH{TOKEN} placeholders
  for (const [key, value] of Object.entries(tokens)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    const escaped = escapeLatex(value);
    
    // Replace both \PH{KEY} and \PH{KEY\_NAME} formats
    const placeholder1 = `\\PH{${key}}`;
    const placeholder2 = `\\PH{${key.replace(/_/g, '\\_')}}`;
    
    filled = filled.split(placeholder1).join(escaped);
    filled = filled.split(placeholder2).join(escaped);
  }
  
  // Step 5: Validate that no placeholders remain
  validateTemplateReplacement(filled);
  
  return filled;
}

/** Joins a list of names/links with a comma, filtering out empties. */
export function joinList(items: Array<string | undefined | null> | undefined, sep = ', '): string {
  if (!items || items.length === 0) return '';
  return items.filter((i): i is string => !!i && i.trim().length > 0).join(sep);
}

/** Formats a number as an Indian Rupee amount, e.g. 12000 -> "Rs. 12,000". */
export function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '';
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

/** "2026-07-24" or a Date -> "24 July 2026". Falls back to the raw string if unparsable. */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Indian academic year for a given date, e.g. July 2026 -> "2026-2027". */
export function academicYearFor(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed; academic year rolls over in June
  return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
