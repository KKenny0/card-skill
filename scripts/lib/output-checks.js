/**
 * Page-evidence decision checks for scripts/check-output.mjs.
 *
 * The output gate runs in two phases:
 *   1. collectPageEvidence (in check-output.mjs) — one browser evaluate pass
 *      that gathers DOM evidence and returns the report object below.
 *   2. this registry — Node-side predicates that read the evidence and emit
 *      issues. Each entry is individually addressable by code and is
 *      exercised by selfTestPageDecisionChecks with synthetic evidence,
 *      with no browser involved.
 *
 * Evidence report fields consumed here (the `needs` lists name them):
 *   scrollWidth, scrollHeight, badImages[], bounds[], textSizes[],
 *   headlineLines[], editorialFontViolations[], htmlTextBoxOverflows[],
 *   editorialVisualSystemErrors[], editorialVisualSystemWarnings[],
 *   svgTextOverflows[], fontLoadFailures[], svgTextOutsideViewbox[],
 *   articleDiagramLabelCollisions[], articleDiagramCaptionIssues[],
 *   articleDiagramBandHeaderOverlaps[], expectsFormulaCard,
 *   formulaCardMetrics[], bigPhraseMetrics[], posterMediaMetrics[],
 *   posterProcessMetrics[].
 *
 * Registry order is the issue emission order; do not reorder entries
 * without a behavior-freeze comparison.
 */

function issue(severity, code, message, details = {}) {
  return { severity, code, message, details };
}

const EDITORIAL_ALLOWED_PRIMARY_FONTS = new Set([
  'dm sans',
  'dm serif display',
  'jetbrains mono',
  'xiangcuidengcusong',
  'xiangcuidazijiti',
]);

const labelPattern = /badge|label|tag|meta|source|num|kicker|eyebrow|ref|attr|byline|colophon|page-indicator|running-title|header|subtitle|caption|brand|footer/i;
const formulaAnnotationPattern = /formula-card-deck/i;

const PAGE_DECISION_CHECKS = [
  {
    code: 'horizontal_overflow',
    severity: 'error',
    needs: ['scrollWidth'],
    decide(report, opts, html, emit) {
      if (report.scrollWidth > opts.width + 2) {
        emit('Page is wider than the capture viewport.', {
          scrollWidth: report.scrollWidth,
          viewportWidth: opts.width,
        });
      }
    },
  },
  {
    code: 'vertical_crop_risk',
    severity: 'error',
    needs: ['scrollHeight'],
    decide(report, opts, html, emit) {
      if (!opts.fullpage && report.scrollHeight > opts.height + 2) {
        emit('Fixed-canvas output is taller than the capture viewport.', {
          scrollHeight: report.scrollHeight,
          viewportHeight: opts.height,
        });
      }
    },
  },
  {
    code: 'image_load_failed',
    severity: 'error',
    needs: ['badImages'],
    decide(report, opts, html, emit) {
      if (report.badImages.length > 0) {
        emit('One or more images failed to load.', {
          images: report.badImages.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'element_out_of_bounds',
    severity: 'error',
    needs: ['bounds'],
    decide(report, opts, html, emit) {
      if (report.bounds.length > 0) {
        emit('Visible elements extend outside the captured area.', {
          elements: report.bounds,
        });
      }
    },
  },
  {
    code: 'svg_text_overflow',
    severity: 'error',
    needs: ['svgTextOverflows'],
    decide(report, opts, html, emit) {
      if (report.svgTextOverflows.length > 0) {
        emit('SVG text extends past its container shape (rect/circle/ellipse). Widen the shape, shorten the text, or reduce font-size.',
          { elements: report.svgTextOverflows });
      }
    },
  },
  {
    code: 'html_text_box_overflow',
    severity: 'error',
    needs: ['htmlTextBoxOverflows'],
    decide(report, opts, html, emit) {
      if (report.htmlTextBoxOverflows.length > 0) {
        emit('HTML text extends past its framed container. Widen the frame, shorten the label, or reduce the font-size.',
          { elements: report.htmlTextBoxOverflows });
      }
    },
  },
  {
    code: 'editorial_visual_system_violation',
    severity: 'error',
    needs: ['editorialVisualSystemErrors'],
    decide(report, opts, html, emit) {
      if (report.editorialVisualSystemErrors.length > 0) {
        emit('Editorial-image visual styling drifted outside the Quiet Paper system. Use token-derived surfaces, hairline borders, low-saturation accents, and restrained contrast.',
          { elements: report.editorialVisualSystemErrors });
      }
    },
  },
  {
    code: 'editorial_visual_system_warning',
    severity: 'warning',
    needs: ['editorialVisualSystemWarnings'],
    decide(report, opts, html, emit) {
      if (report.editorialVisualSystemWarnings.length > 0) {
        emit('Editorial-image styling is visually heavy for Quiet Paper. Prefer layering, whitespace, and hairline structure over heavy shadow.',
          { elements: report.editorialVisualSystemWarnings });
      }
    },
  },
  {
    code: 'font_load_failed',
    severity: 'error',
    needs: ['fontLoadFailures'],
    decide(report, opts, html, emit) {
      if (report.fontLoadFailures.length > 0) {
        emit('@font-face declared but the font did not actually load. Browser fell back silently. Check the @font-face src URL, the .gitignore (fonts must be tracked), and the font-family spelling.',
          { elements: report.fontLoadFailures });
      }
    },
  },
  {
    code: 'editorial_font_primary_not_allowed',
    severity: 'error',
    needs: ['editorialFontViolations'],
    decide(report, opts, html, emit) {
      if (report.editorialFontViolations.length > 0) {
        emit(`Editorial-image text must use a controlled primary font. Use one of: ${[...EDITORIAL_ALLOWED_PRIMARY_FONTS].join(', ')}. Fallback fonts are allowed after the primary font.`,
          { elements: report.editorialFontViolations });
      }
    },
  },
  {
    code: 'svg_text_outside_viewbox',
    severity: 'error',
    needs: ['svgTextOutsideViewbox'],
    decide(report, opts, html, emit) {
      if (report.svgTextOutsideViewbox.length > 0) {
        emit('SVG text bounding box exceeds the viewBox rectangle. Every <text> must render fully inside its SVG viewBox. Fix by widening the viewBox, moving the text inward, or shortening the string.',
          { elements: report.svgTextOutsideViewbox });
      }
    },
  },
  {
    code: 'article_diagram_label_collision',
    severity: 'error',
    needs: ['articleDiagramLabelCollisions'],
    decide(report, opts, html, emit) {
      if (report.articleDiagramLabelCollisions.length > 0) {
        emit('Article-diagram relationship labels overlap nodes, other labels, or the stage boundary. Hide repeated labels, move the label, or simplify the links.',
          { elements: report.articleDiagramLabelCollisions });
      }
    },
  },
  {
    code: 'article_diagram_caption_layout',
    severity: 'error',
    needs: ['articleDiagramCaptionIssues'],
    decide(report, opts, html, emit) {
      if (report.articleDiagramCaptionIssues.length > 0) {
        emit('Article-diagram captions must read as a compact explanation strip, not a narrow paragraph. Keep captions to one or two balanced lines across the diagram width.',
          { elements: report.articleDiagramCaptionIssues });
      }
    },
  },
  {
    code: 'article_diagram_band_header_overlap',
    severity: 'error',
    needs: ['articleDiagramBandHeaderOverlaps'],
    decide(report, opts, html, emit) {
      if (report.articleDiagramBandHeaderOverlaps.length > 0) {
        emit('Article-diagram boundary band labels and descriptions must not overlap node cards. Move nodes below the band header or reduce density.',
          { elements: report.articleDiagramBandHeaderOverlaps });
      }
    },
  },
  {
    code: 'poster_evidence_media_density',
    severity: 'error',
    needs: ['posterMediaMetrics'],
    decide(report, opts, html, emit) {
      const invalidPosterMedia = report.posterMediaMetrics.filter(item => (
        item.widthRatio < 0.78
        || item.imageHeightRatio < 0.25
        || item.imageHeightRatio > (item.mediaOnly ? 0.84 : 0.76)
        || item.paintedWidthRatio < 0.5
        || item.paintedHeightRatio < 0.16
        || item.paintedAreaRatio < 0.1
        || item.naturalWidth < 320
        || item.naturalHeight < 180
        || item.bodyFillRatio < (item.hasAdjacentCopy ? 0.68 : 0.72)
        || (!item.hasAdjacentCopy && item.bottomGapRatio > 0.16)
        || (item.hasAdjacentCopy && item.adjacentCopyGapRatio > 0.1)
      ));
      if (invalidPosterMedia.length > 0) {
        emit('Poster evidence media must be a legible primary field, not a small asset floating inside a large container.',
          { elements: invalidPosterMedia });
      }
    },
  },
  {
    code: 'poster_process_density',
    severity: 'error',
    needs: ['posterProcessMetrics'],
    decide(report, opts, html, emit) {
      const invalidPosterProcess = report.posterProcessMetrics.filter(item => (
        item.widthRatio < 0.78
        || item.heightRatio < 0.38
        || item.heightRatio > (item.processOnly ? 0.84 : 0.65)
        || item.steps < 2
        || item.steps > 5
        || item.bodyFillRatio < 0.72
        || item.bottomGapRatio > 0.16
      ));
      if (invalidPosterProcess.length > 0) {
        emit('Poster-native process evidence must fill the reading field with two to five legible steps.',
          { elements: invalidPosterProcess });
      }
    },
  },
  {
    code: 'article_diagram_formula_metrics_missing',
    severity: 'error',
    needs: ['expectsFormulaCard', 'formulaCardMetrics'],
    decide(report, opts, html, emit) {
      if (report.expectsFormulaCard && report.formulaCardMetrics.length !== 1) {
        emit('Compression summary output is missing the semantic formula-card measurement markers.',
          { count: report.formulaCardMetrics.length });
      }
    },
  },
  {
    code: 'article_diagram_formula_density',
    severity: 'error',
    needs: ['formulaCardMetrics'],
    decide(report, opts, html, emit) {
      const invalidFormulaCards = report.formulaCardMetrics.filter(item => (
        item.horizontalFill < 0.66
        || item.horizontalFill > 0.9
        || item.verticalFill < 0.4
        || item.verticalFill > 0.72
        || Math.abs(item.leftWhitespace - item.rightWhitespace) > 48
        || Math.abs(item.topWhitespace - item.bottomWhitespace) > 36
        || item.noteLines < 1
        || item.noteLines > 2
        || item.formulaRows > 3
      ));
      if (invalidFormulaCards.length > 0) {
        emit('Editorial Equation content density or whitespace balance is outside the approved visual range.',
          { elements: invalidFormulaCards });
      }
    },
  },
  {
    code: 'big_phrase_missing',
    severity: 'error',
    needs: ['bigPhraseMetrics'],
    decide(report, opts, html, emit) {
      if (report.bigPhraseMetrics.length === 0) {
        const hasBigMarker = html.includes('data-card-mode="big"');
        if (hasBigMarker) {
          emit('Big mode output must include a visible .phrase element.',
            {});
        }
      }
    },
  },
  {
    code: 'big_phrase_too_small',
    severity: 'error',
    needs: ['bigPhraseMetrics'],
    decide(report, opts, html, emit) {
      const undersizedBigPhrases = report.bigPhraseMetrics.filter(item => (
        item.fontSize < 96
        || item.areaRatio < 0.025
        || item.heightRatio < 0.08
      ));
      if (undersizedBigPhrases.length > 0) {
        emit('Big mode main phrase is too small for a large-text poster. Increase font size or use a denser composition.',
          { elements: undersizedBigPhrases });
      }
    },
  },
  {
    code: 'body_text_too_small',
    severity: 'error',
    needs: ['textSizes'],
    decide(report, opts, html, emit) {
      const bodyText = report.textSizes.filter(item => {
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(item.tag)) return false;
        if (labelPattern.test(item.className)) return false;
        if (formulaAnnotationPattern.test(item.className)) return false;
        return item.text.length >= 12 && item.fontSize >= 16;
      });
      const smallBodyText = bodyText.filter(item => item.fontSize < 36);
      if (smallBodyText.length > 0) {
        emit('Body text is below the 36px readability floor.', {
          elements: smallBodyText.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'annotation_text_small',
    severity: 'warning',
    needs: ['textSizes'],
    decide(report, opts, html, emit) {
      const annotationText = report.textSizes.filter(item => {
        if (!labelPattern.test(item.className) && !formulaAnnotationPattern.test(item.className)) return false;
        if (/colophon|brand|footer|page-indicator/i.test(item.className)) return false;
        return item.text.length >= 4 && item.fontSize > 0 && item.fontSize < 24;
      });
      if (annotationText.length > 0) {
        emit('Some annotation text is below the 24px guideline.', {
          elements: annotationText.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'mode_label_visible',
    severity: 'error',
    needs: ['textSizes'],
    decide(report, opts, html, emit) {
      const bannedModeLabels = new Set([
        'IN-ARTICLE IMAGE',
        'IN ARTICLE IMAGE',
        'EDITORIAL IMAGE',
        'BLOG HERO',
        'BLOG COVER',
        'WECHAT COVER',
        'ARTICLE COVER',
        'COVER IMAGE',
        'ARTICLE DIAGRAM',
        'CONCEPT MAP',
        'PROCESS FLOW',
        'BOUNDARY MODEL',
        // Chinese equivalents — same brief-leak class, just localized
        '公众号头图',
        '公众号封面',
        '博客封面',
        '博客头图',
        '正文配图',
        '正文解释图',
        '段落配图',
        '文章封面',
        '封面图',
      ]);
      const visibleModeLabels = report.textSizes.filter(item => {
        const normalized = item.text.toUpperCase().replace(/\s+/g, ' ').trim();
        return bannedModeLabels.has(normalized);
      });
      if (visibleModeLabels.length > 0) {
        emit('Output mode labels should not appear in the artwork.', {
          elements: visibleModeLabels.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'editorial_brief_visible',
    severity: 'error',
    needs: ['textSizes'],
    decide(report, opts, html, emit) {
      const briefLeakPatterns = [
        /给\s*[^，。；:：]{1,48}(这一节|这节|本节|段落|章节)?\s*使用/,
        /(用作|作为)\s*(正文|文章|章节|段落|小节)?\s*配图/,
        /(这张图|该图|此图)\s*(用于|用来|适合|作为)/,
        /(安静|低干扰).{0,16}(停顿|视觉换气|正文|配图)/,
        /像文章中间的?一次停顿/,
        /\b(visual pause|in-article illustration|section illustration)\b/i,
      ];
      const visibleBriefLeaks = report.textSizes.filter(item => {
        const normalized = item.text.replace(/\s+/g, ' ').trim();
        return briefLeakPatterns.some(pattern => pattern.test(normalized));
      });
      if (visibleBriefLeaks.length > 0) {
        emit('Editorial-image brief or usage notes should not appear in the artwork.', {
          elements: visibleBriefLeaks.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'technical_term_spacing_bad',
    severity: 'error',
    needs: ['textSizes'],
    decide(report, opts, html, emit) {
      const gluedTermPatterns = [
        /\bAIAgent\b/i,
        /\bHermesAgent\b/i,
        /\bContextCompression\b/i,
      ];
      const visibleGluedTerms = report.textSizes.filter(item => {
        const normalized = item.text.replace(/\s+/g, ' ').trim();
        return gluedTermPatterns.some(pattern => pattern.test(normalized));
      });
      if (visibleGluedTerms.length > 0) {
        emit('Technical or product terms should preserve real word spacing.', {
          elements: visibleGluedTerms.slice(0, 10),
        });
      }
    },
  },
  {
    code: 'text_line_break_bad',
    severity: 'error',
    needs: ['headlineLines'],
    decide(report, opts, html, emit) {
      const badHeadlineBreaks = report.headlineLines.filter(item => {
        const last = item.lines[item.lines.length - 1];
        const lastText = last?.text || '';
        const cjkOnly = lastText.replace(/[^\u3400-\u9fff]/g, '');
        const hasShortCjkLine = item.lines.some(line => {
          const lineText = line.text || '';
          const lineCjk = lineText.replace(/[^\u3400-\u9fff]/g, '');
          return lineCjk.length > 0 && lineText.length <= 2 && line.width < 180;
        });
        const isShortLastLine = item.lineCount >= 2 && item.lastLineRatio < 0.24 && last.width < 180;
        const isCjkOrphan = item.lineCount >= 2 && cjkOnly.length > 0 && lastText.length <= 2;
        const isTooManyLines = item.lineCount > 3 && item.fontSize >= 48;
        return hasShortCjkLine || isShortLastLine || isCjkOrphan || isTooManyLines;
      });
      if (badHeadlineBreaks.length > 0) {
        emit('Headline or short-text line breaks do not meet the visual standard.', {
          elements: badHeadlineBreaks.map(item => ({
            tag: item.tag,
            className: item.className,
            text: item.text,
            lineCount: item.lineCount,
            lastLineRatio: Number(item.lastLineRatio.toFixed(2)),
            lines: item.lines,
          })).slice(0, 10),
        });
      }
    },
  },
];

function runPageDecisionChecks(report, opts, html, issueFactory, issues) {
  for (const check of PAGE_DECISION_CHECKS) {
    const emit = (message, details) => {
      issues.push(issueFactory(check.severity, check.code, message, details));
    };
    check.decide(report, opts, html, emit);
  }
}

function missingEvidenceFields(report, needed) {
  return needed.filter(field => report[field] === undefined);
}

function selfTestPageDecisionChecks() {
  const baseEvidence = () => ({
    scrollWidth: 1080,
    clientWidth: 1080,
    scrollHeight: 720,
    clientHeight: 720,
    badImages: [],
    bounds: [],
    textSizes: [],
    headlineLines: [],
    editorialFontViolations: [],
    htmlTextBoxOverflows: [],
    editorialVisualSystemErrors: [],
    editorialVisualSystemWarnings: [],
    svgTextOverflows: [],
    fontLoadFailures: [],
    svgTextOutsideViewbox: [],
    articleDiagramLabelCollisions: [],
    articleDiagramCaptionIssues: [],
    articleDiagramBandHeaderOverlaps: [],
    expectsFormulaCard: false,
    formulaCardMetrics: [],
    bigPhraseMetrics: [],
    posterMediaMetrics: [],
    posterProcessMetrics: [],
    imageResourceUrls: [],
  });
  const baseOpts = { width: 1080, height: 720, fullpage: false };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  // needs declarations must match the base evidence shape.
  for (const check of PAGE_DECISION_CHECKS) {
    const missing = missingEvidenceFields(baseEvidence(), check.needs);
    assert(missing.length === 0, `check ${check.code} declares missing evidence fields: ${missing.join(', ')}`);
  }

  // Silent control: clean evidence must produce no issues.
  const controlIssues = [];
  runPageDecisionChecks(baseEvidence(), baseOpts, '', issue, controlIssues);
  assert(controlIssues.length === 0, `silent control evidence produced issues: ${controlIssues.map(i => i.code).join(', ')}`);

  const passingFormulaMetric = {
    horizontalFill: 0.75, verticalFill: 0.5,
    leftWhitespace: 10, rightWhitespace: 12,
    topWhitespace: 5, bottomWhitespace: 6,
    noteLines: 1, formulaRows: 1,
  };
  const passingPosterMedia = {
    widthRatio: 0.9, imageHeightRatio: 0.5, mediaOnly: false,
    paintedWidthRatio: 0.7, paintedHeightRatio: 0.3, paintedAreaRatio: 0.2,
    naturalWidth: 800, naturalHeight: 600,
    bodyFillRatio: 0.8, bottomGapRatio: 0.1,
    hasAdjacentCopy: false, adjacentCopyGapRatio: 0.05,
  };
  const passingPosterProcess = {
    widthRatio: 0.9, heightRatio: 0.5, processOnly: false,
    steps: 3, bodyFillRatio: 0.8, bottomGapRatio: 0.1,
  };

  const CASES = [
    { code: 'horizontal_overflow', evidence: { scrollWidth: 1085 } },
    { code: 'vertical_crop_risk', evidence: { scrollHeight: 723 } },
    { code: 'image_load_failed', evidence: { badImages: ['broken.png'] } },
    { code: 'element_out_of_bounds', evidence: { bounds: [{ tag: 'DIV' }] } },
    { code: 'svg_text_overflow', evidence: { svgTextOverflows: [{ tag: 'text' }] } },
    { code: 'html_text_box_overflow', evidence: { htmlTextBoxOverflows: [{ tag: 'SPAN' }] } },
    { code: 'editorial_visual_system_violation', evidence: { editorialVisualSystemErrors: [{ tag: 'DIV' }] } },
    { code: 'editorial_visual_system_warning', evidence: { editorialVisualSystemWarnings: [{ tag: 'DIV' }] } },
    { code: 'font_load_failed', evidence: { fontLoadFailures: [{ family: 'dm sans' }] } },
    { code: 'editorial_font_primary_not_allowed', evidence: { editorialFontViolations: [{ tag: 'P' }] } },
    { code: 'svg_text_outside_viewbox', evidence: { svgTextOutsideViewbox: [{ tag: 'text' }] } },
    { code: 'article_diagram_label_collision', evidence: { articleDiagramLabelCollisions: [{ label: 'x' }] } },
    { code: 'article_diagram_caption_layout', evidence: { articleDiagramCaptionIssues: [{ width: 10 }] } },
    { code: 'article_diagram_band_header_overlap', evidence: { articleDiagramBandHeaderOverlaps: [{ zone: 'z' }] } },
    { code: 'poster_evidence_media_density', evidence: { posterMediaMetrics: [passingPosterMedia] }, expectSilent: true },
    { code: 'poster_evidence_media_density', evidence: { posterMediaMetrics: [{ ...passingPosterMedia, widthRatio: 0.5 }] } },
    { code: 'poster_process_density', evidence: { posterProcessMetrics: [passingPosterProcess] }, expectSilent: true },
    { code: 'poster_process_density', evidence: { posterProcessMetrics: [{ ...passingPosterProcess, steps: 1 }] } },
    { code: 'article_diagram_formula_metrics_missing', evidence: { expectsFormulaCard: true, formulaCardMetrics: [passingFormulaMetric] }, expectSilent: true },
    { code: 'article_diagram_formula_metrics_missing', evidence: { expectsFormulaCard: true, formulaCardMetrics: [] } },
    { code: 'article_diagram_formula_density', evidence: { formulaCardMetrics: [passingFormulaMetric] }, expectSilent: true },
    { code: 'article_diagram_formula_density', evidence: { formulaCardMetrics: [{ ...passingFormulaMetric, horizontalFill: 0.5 }] } },
    { code: 'big_phrase_missing', evidence: {}, html: '<div data-card-mode="big"><div class="page"></div></div>' },
    { code: 'big_phrase_missing', evidence: {}, html: '<div data-card-mode="poster"></div>', expectSilent: true },
    { code: 'big_phrase_too_small', evidence: { bigPhraseMetrics: [{ fontSize: 90, areaRatio: 0.03, heightRatio: 0.09 }] } },
    { code: 'big_phrase_too_small', evidence: { bigPhraseMetrics: [{ fontSize: 120, areaRatio: 0.05, heightRatio: 0.12 }] }, expectSilent: true },
    { code: 'body_text_too_small', evidence: { textSizes: [{ tag: 'P', className: '', text: 'a'.repeat(15), fontSize: 30 }] } },
    { code: 'body_text_too_small', evidence: { textSizes: [{ tag: 'P', className: '', text: 'a'.repeat(15), fontSize: 40 }] }, expectSilent: true },
    { code: 'body_text_too_small', evidence: { textSizes: [{ tag: 'P', className: 'badge', text: 'a'.repeat(15), fontSize: 30 }] }, expectSilent: true },
    { code: 'annotation_text_small', evidence: { textSizes: [{ tag: 'SPAN', className: 'badge', text: 'note', fontSize: 20 }] } },
    { code: 'annotation_text_small', evidence: { textSizes: [{ tag: 'SPAN', className: 'colophon', text: 'note', fontSize: 20 }] }, expectSilent: true },
    { code: 'mode_label_visible', evidence: { textSizes: [{ tag: 'SPAN', className: '', text: 'Concept  Map', fontSize: 30 }] } },
    { code: 'mode_label_visible', evidence: { textSizes: [{ tag: 'SPAN', className: '', text: '概念图', fontSize: 30 }] }, expectSilent: true },
    { code: 'editorial_brief_visible', evidence: { textSizes: [{ tag: 'P', className: '', text: '这一节作为正文配图使用', fontSize: 30 }] } },
    { code: 'technical_term_spacing_bad', evidence: { textSizes: [{ tag: 'P', className: '', text: 'AIAgent 是什么', fontSize: 30 }] } },
    { code: 'text_line_break_bad', evidence: { headlineLines: [{ tag: 'H1', className: '', text: '标题文本', fontSize: 60, lineCount: 2, lastLineRatio: 0.1, lines: [{ text: '标题文', width: 300 }, { text: '本', width: 50 }] }] } },
    { code: 'text_line_break_bad', evidence: { headlineLines: [{ tag: 'H1', className: '', text: '标题文本内容', fontSize: 60, lineCount: 2, lastLineRatio: 0.5, lines: [{ text: '标题文本内容', width: 420 }, { text: '第二行较宽', width: 250 }] }] }, expectSilent: true },
  ];

  const covered = new Set();
  for (const testCase of CASES) {
    const check = PAGE_DECISION_CHECKS.find(entry => entry.code === testCase.code);
    assert(check, `self-test case names unknown check ${testCase.code}`);
    const issues = [];
    runPageDecisionChecks({ ...baseEvidence(), ...testCase.evidence }, { ...baseOpts }, testCase.html || '', issue, issues);
    const fired = issues.filter(entry => entry.code === testCase.code);
    if (testCase.expectSilent) {
      assert(fired.length === 0, `check ${testCase.code} fired on control evidence`);
      continue;
    }
    assert(fired.length > 0, `check ${testCase.code} did not fire on its evidence`);
    assert(fired.every(entry => entry.severity === check.severity), `check ${testCase.code} emitted the wrong severity`);
    covered.add(testCase.code);
  }

  const uncovered = PAGE_DECISION_CHECKS.filter(check => !covered.has(check.code)).map(check => check.code);
  assert(uncovered.length === 0, `page decision checks without a firing self-test case: ${uncovered.join(', ')}`);

  return { checks: PAGE_DECISION_CHECKS.length, cases: CASES.length };
}

module.exports = {
  EDITORIAL_ALLOWED_PRIMARY_FONTS,
  PAGE_DECISION_CHECKS,
  issue,
  missingEvidenceFields,
  runPageDecisionChecks,
  selfTestPageDecisionChecks,
};
