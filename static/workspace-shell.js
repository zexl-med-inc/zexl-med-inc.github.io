/**
 * ZEXLmed Workspace Shell — shared header, navigation, document context, overview.
 * Vanilla JS; no dependencies. Used by docs/app.html only.
 */
(function (global) {
  'use strict';

  var NAV_ITEMS = [
    { id: 'home', label: 'Home', href: '/', enabled: true },
    { id: 'documents', label: 'Documents', href: null, enabled: false, placeholderMessage: 'Documents library is not available in this release.' },
    { id: 'workspace', label: 'Workspace', href: '/app.html', enabled: true },
    { id: 'history', label: 'History', href: null, enabled: false, placeholderMessage: 'Evaluation history is not available in this release.' },
    { id: 'administration', label: 'Administration', href: '/admin.html', enabled: true }
  ];

  var DOC_TYPE_LABELS = {
    AUDIT_RECORD: 'Audit Record',
    CAPA_RECORD: 'CAPA Record',
    COMPLAINT_RECORD: 'Complaint Record',
    DESIGN_HISTORY: 'Design History',
    NCR_RECORD: 'NCR Record',
    PREVENTIVE_ACTION: 'Preventive Action',
    PRODUCTION_RECORD: 'Production Record',
    QUALITY_MANUAL: 'Quality Manual',
    UNKNOWN: 'Unclassified'
  };

  var state = {
    mountEl: null,
    overviewEl: null,
    llmEl: null,
    findingsEl: null,
    onPlaceholderNav: null,
    onExitSandbox: null,
    onExplainRequest: null,
    onRedraftRequest: null,
    onCopyRedraft: null,
    onDownloadRedraft: null,
    onExpertReview: null,
    onExpertReviewInfo: null,
    activeNav: 'workspace',
    documentName: null,
    documentType: null,
    evaluationStatus: 'idle',
    verdict: null,
    documentRisk: null,
    expert: {
      url: null,
      available: false
    },
    explain: {
      status: 'idle',
      enabled: false,
      error: null,
      notice: null,
      elapsedSec: 0,
      data: null
    },
    redraft: {
      status: 'idle',
      enabled: false,
      error: null,
      notice: null,
      elapsedSec: 0,
      data: null,
      sourceContext: null
    },
    findings: {
      status: 'idle',
      error: null,
      items: null,
      selectedId: null,
      filters: {
        severity: 'ALL',
        review_status: 'ALL',
        clause: 'ALL'
      }
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDocumentType(raw) {
    if (!raw) return '—';
    if (DOC_TYPE_LABELS[raw]) return DOC_TYPE_LABELS[raw];
    return raw.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function statusLabel(evaluationStatus) {
    switch (evaluationStatus) {
      case 'auth': return 'Sign-in required';
      case 'ready': return 'Ready to evaluate';
      case 'evaluating': return 'Evaluating';
      case 'complete': return 'Complete';
      case 'error': return 'Evaluation failed';
      default: return 'Awaiting document';
    }
  }

  function verdictPillHtml(verdict) {
    if (!verdict) {
      return '<span class="zws-verdict-pill zws-verdict-pill--neutral">—</span>';
    }
    var cls = 'zws-verdict-pill zws-verdict-pill--' + verdict;
    return '<span class="' + cls + '">' + escapeHtml(verdict.replace(/_/g, ' ')) + '</span>';
  }

  function renderHeader() {
    var navHtml = NAV_ITEMS.map(function (item) {
      var active = item.id === state.activeNav ? ' zws-nav-item--active' : '';
      if (!item.enabled) {
        return '<button type="button" class="zws-nav-item zws-nav-item--disabled' + active + '" data-nav-id="' + item.id + '" data-placeholder="1" title="Coming soon">' + escapeHtml(item.label) + '</button>';
      }
      return '<a href="' + escapeHtml(item.href) + '" class="zws-nav-item' + active + '" data-nav-id="' + item.id + '">' + escapeHtml(item.label) + '</a>';
    }).join('');

    return (
      '<header class="zws-header">' +
        '<a href="/app.html" class="zws-brand">ZEXL<span>med</span></a>' +
        '<nav class="zws-nav" aria-label="Workspace navigation">' + navHtml + '</nav>' +
        '<div class="zws-header-actions">' +
          '<button type="button" class="zws-exit-btn" id="zws-exit-sandbox">Exit Sandbox</button>' +
        '</div>' +
      '</header>'
    );
  }

  function renderContextBar() {
    var statusCls = state.evaluationStatus === 'evaluating' || state.evaluationStatus === 'complete'
      ? ' zws-status-pill--active' : '';
    return (
      '<div class="zws-context" aria-label="Document context">' +
        '<div class="zws-context-item">' +
          '<span class="zws-context-label">Document</span>' +
          '<span class="zws-context-value" id="zws-ctx-name">' + escapeHtml(state.documentName || '—') + '</span>' +
        '</div>' +
        '<div class="zws-context-item">' +
          '<span class="zws-context-label">Type</span>' +
          '<span class="zws-context-value zws-context-value--mono" id="zws-ctx-type">' + escapeHtml(formatDocumentType(state.documentType)) + '</span>' +
        '</div>' +
        '<div class="zws-context-item">' +
          '<span class="zws-context-label">Status</span>' +
          '<span class="zws-status-pill' + statusCls + '" id="zws-ctx-status">' + escapeHtml(statusLabel(state.evaluationStatus)) + '</span>' +
        '</div>' +
        '<div class="zws-context-item">' +
          '<span class="zws-context-label">Verdict</span>' +
          '<span id="zws-ctx-verdict">' + verdictPillHtml(state.verdict) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderShell() {
    if (!state.mountEl) return;
    state.mountEl.innerHTML = '<div class="zws-shell">' + renderHeader() + renderContextBar() + '</div>';
    bindShellEvents();
  }

  function bindShellEvents() {
    if (!state.mountEl) return;

    var exitBtn = state.mountEl.querySelector('#zws-exit-sandbox');
    if (exitBtn) {
      exitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof state.onExitSandbox === 'function') {
          state.onExitSandbox(e);
        }
      });
    }

    state.mountEl.querySelectorAll('[data-placeholder="1"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-nav-id');
        var item = NAV_ITEMS.find(function (n) { return n.id === id; });
        var msg = (item && item.placeholderMessage) || 'This section is not available yet.';
        if (typeof state.onPlaceholderNav === 'function') {
          state.onPlaceholderNav(msg, id);
        }
      });
    });
  }

  function renderOverviewUpload() {
    if (!state.overviewEl) return;
    state.overviewEl.innerHTML =
      '<section class="zws-overview" aria-label="Workspace overview">' +
        '<div class="zws-overview-header">' +
          '<div class="zws-overview-title">Workspace Overview</div>' +
          '<div class="zws-overview-sub">Upload state</div>' +
        '</div>' +
        '<p class="zws-overview-empty">' +
          'Upload a QMS document (.docx or .pdf) to begin clause-level evaluation. ' +
          'Results, risks, and next actions will appear here after evaluation completes.' +
        '</p>' +
      '</section>';
  }

  function renderOverviewAuth() {
    if (!state.overviewEl) return;
    state.overviewEl.innerHTML =
      '<section class="zws-overview" aria-label="Workspace overview">' +
        '<div class="zws-overview-header">' +
          '<div class="zws-overview-title">Workspace Overview</div>' +
          '<div class="zws-overview-sub">Sign-in required</div>' +
        '</div>' +
        '<p class="zws-overview-empty">Enter your invite code to access the evaluation workspace.</p>' +
      '</section>';
  }

  function renderOverviewEvaluating() {
    if (!state.overviewEl) return;
    state.overviewEl.innerHTML =
      '<section class="zws-overview" aria-label="Workspace overview">' +
        '<div class="zws-overview-header">' +
          '<div class="zws-overview-title">Workspace Overview</div>' +
          '<div class="zws-overview-sub">Evaluation in progress</div>' +
        '</div>' +
        '<p class="zws-overview-empty">Analyzing document against ISO 13485:2016 clauses. Overview will update when evaluation completes.</p>' +
      '</section>';
  }

  function renderOverviewResult(data) {
    if (!state.overviewEl || !data) return;

    var decision = data.decision || '';
    var risk = (data.report && data.report.risk) ? data.report.risk : '—';
    var explanation = data.explanation || '';
    var requiredAction = (data.report && data.report.required_action) ? data.report.required_action : '';
    var reviewRequired = data.review_status === 'YES';
    var showExplain = data.showExplain === true;
    var showRedraft = data.showRedraft === true;
    var showExpert = data.showExpert === true;
    var expertLabel = data.expertLabel || 'Expert Review';

    var riskBody = '<strong>Risk level:</strong> ' + escapeHtml(risk);
    if (reviewRequired) {
      riskBody += '<br><strong>Human review:</strong> Required before compliance action.';
    }

    var actionsBody = escapeHtml(data.nextActionFixed || '');
    if (requiredAction) {
      actionsBody += (actionsBody ? '<br><br>' : '') + '<span style="color:var(--zws-text-muted);font-size:0.78rem">Engine recommendation</span><br>' + escapeHtml(requiredAction);
    }

    var explainCls = 'zws-action-link' + (showExplain ? '' : ' zws-action-link--disabled');
    var redraftCls = 'zws-action-link' + (showRedraft ? '' : ' zws-action-link--disabled');
    var expertCls = 'zws-action-link zws-action-link--primary' + (showExpert ? '' : ' zws-action-link--disabled');
    var explainDis = showExplain ? '' : ' disabled';
    var redraftDis = showRedraft ? '' : ' disabled';
    var expertDis = showExpert ? '' : ' disabled';

    state.overviewEl.innerHTML =
      '<section class="zws-overview" aria-label="Workspace overview" id="workspace-overview">' +
        '<div class="zws-overview-header">' +
          '<div class="zws-overview-title">Workspace Overview</div>' +
          '<div class="zws-overview-sub">Post-evaluation summary</div>' +
        '</div>' +
        '<div class="zws-overview-grid">' +
          '<div class="zws-overview-card">' +
            '<div class="zws-overview-card-label">Evaluation summary</div>' +
            '<div class="zws-overview-card-body">' +
              verdictPillHtml(decision) +
              '<p style="margin-top:0.65rem">' + escapeHtml(explanation) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="zws-overview-card">' +
            '<div class="zws-overview-card-label">Key risks</div>' +
            '<div class="zws-overview-card-body">' + riskBody + '</div>' +
          '</div>' +
          '<div class="zws-overview-card">' +
            '<div class="zws-overview-card-label">Next actions</div>' +
            '<div class="zws-overview-card-body">' + (actionsBody || '—') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="zws-overview-actions">' +
          '<button type="button" class="zws-action-link" id="zws-link-findings">Findings</button>' +
          '<button type="button" class="' + explainCls + '" id="zws-link-explain"' + explainDis + '>Explanation</button>' +
          '<button type="button" class="' + redraftCls + '" id="zws-link-redraft"' + redraftDis + '>Redraft</button>' +
          '<button type="button" class="' + expertCls + '" id="zws-link-expert"' + expertDis + '>' + escapeHtml(expertLabel) + '</button>' +
        '</div>' +
      '</section>';

    var findingsBtn = state.overviewEl.querySelector('#zws-link-findings');
    var explainBtn = state.overviewEl.querySelector('#zws-link-explain');
    var redraftBtn = state.overviewEl.querySelector('#zws-link-redraft');
    var expertBtn = state.overviewEl.querySelector('#zws-link-expert');

    if (findingsBtn) {
      findingsBtn.addEventListener('click', function () {
        scrollToFindings();
      });
    }
    if (explainBtn && showExplain) {
      explainBtn.addEventListener('click', function () {
        scrollToLlmPanel('explain');
        if (typeof state.onExplainRequest === 'function') state.onExplainRequest();
      });
    }
    if (redraftBtn && showRedraft) {
      redraftBtn.addEventListener('click', function () {
        scrollToLlmPanel('redraft');
        if (typeof state.onRedraftRequest === 'function') state.onRedraftRequest();
      });
    }
    if (expertBtn && showExpert) {
      expertBtn.addEventListener('click', function () {
        invokeExpertReview();
      });
    }

    renderFindingsPanel();
    renderLlmPanels();
  }

  function invokeExpertReview() {
    if (state.expert.available && state.expert.url) {
      if (typeof state.onExpertReview === 'function') {
        state.onExpertReview(state.expert.url);
        return;
      }
    }
    if (typeof state.onExpertReviewInfo === 'function') {
      state.onExpertReviewInfo();
      return;
    }
    var legacy = document.getElementById('expert-review-btn');
    if (legacy && typeof legacy.onclick === 'function') {
      legacy.onclick();
    }
  }

  function expertReviewActionHtml(opts) {
    opts = opts || {};
    if (!state.expert.url) return '';
    var label = state.expert.available ? 'Open Expert Review' : 'Expert Review access';
    var cls = 'zws-action-link' + (opts.primary ? ' zws-action-link--primary' : '');
    return (
      '<button type="button" class="' + cls + '" data-zws-expert-open>' +
        escapeHtml(label) +
      '</button>'
    );
  }

  function scrollToLlmPanel(which) {
    var id = which === 'redraft' ? 'zws-redraft-panel' : 'zws-explain-panel';
    var target = document.getElementById(id) || state.llmEl;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToFindings() {
    var target = document.getElementById('workspace-findings') || state.findingsEl;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reviewStatusBadgeHtml(status) {
    var s = String(status || 'PENDING').toUpperCase();
    var isReviewed = s === 'REVIEWED';
    var label = isReviewed ? 'Reviewed' : 'Needs expert review';
    var icon = isReviewed ? '✓' : '○';
    var cls = isReviewed ? 'zws-review-badge--reviewed' : 'zws-review-badge--pending';
    return (
      '<span class="zws-review-badge ' + cls + '" title="' + escapeHtml(label) + '">' +
        '<span class="zws-review-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="zws-review-text">' + escapeHtml(label) + '</span>' +
      '</span>'
    );
  }

  function uniqueSorted(values) {
    var seen = {};
    var out = [];
    (values || []).forEach(function (v) {
      var key = String(v == null ? '' : v);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    out.sort();
    return out;
  }

  function filteredFindings() {
    var items = state.findings.items || [];
    var f = state.findings.filters || {};
    return items.filter(function (item) {
      if (f.severity && f.severity !== 'ALL' && String(item.severity) !== f.severity) return false;
      if (f.review_status && f.review_status !== 'ALL' && String(item.review_status) !== f.review_status) return false;
      if (f.clause && f.clause !== 'ALL' && String(item.clause) !== f.clause) return false;
      return true;
    });
  }

  function selectedFinding() {
    var id = state.findings.selectedId;
    if (!id || !state.findings.items) return null;
    for (var i = 0; i < state.findings.items.length; i++) {
      if (state.findings.items[i].finding_id === id) return state.findings.items[i];
    }
    return null;
  }

  function ensureFindingsSelection(visible) {
    if (!visible.length) {
      state.findings.selectedId = null;
      return;
    }
    var stillVisible = visible.some(function (item) {
      return item.finding_id === state.findings.selectedId;
    });
    if (!stillVisible) {
      state.findings.selectedId = visible[0].finding_id;
    }
  }

  function renderFindingsEvidence(evidence) {
    var list = Array.isArray(evidence) ? evidence : [];
    if (!list.length) {
      return '<p class="zws-findings-empty-inline">No evidence excerpts are available for this finding.</p>';
    }
    var html = '<ul class="zws-evidence-list">';
    list.forEach(function (ev, idx) {
      var text = ev && typeof ev.text === 'string' ? ev.text : '';
      html +=
        '<li class="zws-evidence-item">' +
          '<div class="zws-evidence-index" aria-hidden="true">E' + String(idx + 1) + '</div>' +
          '<div class="zws-evidence-text">' + escapeHtml(text || '(empty excerpt)') + '</div>' +
        '</li>';
    });
    html += '</ul>';
    return html;
  }

  function renderFindingsReasonCodes(codes) {
    var list = Array.isArray(codes) ? codes : [];
    if (!list.length) {
      return '<p class="zws-findings-empty-inline">No reason codes.</p>';
    }
    return (
      '<ul class="zws-reason-list">' +
        list.map(function (code) {
          return '<li class="zws-reason-chip"><code>' + escapeHtml(String(code)) + '</code></li>';
        }).join('') +
      '</ul>'
    );
  }

  function renderFindingsDetail(item) {
    if (!item) {
      return '<p class="zws-findings-empty-inline">Select a finding to view details and evidence.</p>';
    }
    var reviewNote = '';
    if (String(item.review_status || '').toUpperCase() === 'PENDING') {
      reviewNote =
        '<p class="zws-findings-review-note">' +
          'Needs expert review. Review status becomes Reviewed only after an expert submits feedback for this clause.' +
        '</p>';
    } else {
      reviewNote =
        '<p class="zws-findings-review-note">' +
          'Reviewed — expert feedback is recorded for this clause.' +
        '</p>';
    }
    var expertCta = state.expert.url
      ? '<div class="zws-findings-expert-actions">' + expertReviewActionHtml({ primary: true }) + '</div>'
      : '';
    return (
      '<div class="zws-findings-detail-inner">' +
        '<div class="zws-findings-detail-head">' +
          '<div class="zws-findings-detail-clause">' + escapeHtml(item.clause || '—') + '</div>' +
          '<div class="zws-findings-detail-badges">' +
            verdictPillHtml(item.severity) +
            reviewStatusBadgeHtml(item.review_status) +
          '</div>' +
        '</div>' +
        reviewNote +
        expertCta +
        fieldBlock('Summary', item.summary) +
        '<div class="zws-field">' +
          '<div class="zws-field-label">Evidence</div>' +
          renderFindingsEvidence(item.evidence) +
        '</div>' +
        '<div class="zws-field">' +
          '<div class="zws-field-label">Reason codes</div>' +
          renderFindingsReasonCodes(item.reason_codes) +
        '</div>' +
        fieldBlock('Recommended action', item.recommended_action) +
        fieldBlock('Finding ID', item.finding_id) +
      '</div>'
    );
  }

  function renderFindingsFilters(items) {
    var severities = uniqueSorted(items.map(function (i) { return i.severity; }));
    var clauses = uniqueSorted(items.map(function (i) { return i.clause; }));
    var f = state.findings.filters;

    function optionHtml(value, label, selected) {
      return (
        '<option value="' + escapeHtml(value) + '"' +
        (selected === value ? ' selected' : '') + '>' +
        escapeHtml(label) +
        '</option>'
      );
    }

    var sevOpts = optionHtml('ALL', 'All severities', f.severity) +
      severities.map(function (s) { return optionHtml(s, s, f.severity); }).join('');
    var revOpts =
      optionHtml('ALL', 'All review statuses', f.review_status) +
      optionHtml('PENDING', 'Needs expert review', f.review_status) +
      optionHtml('REVIEWED', 'Reviewed', f.review_status);
    var clauseOpts = optionHtml('ALL', 'All clauses', f.clause) +
      clauses.map(function (c) { return optionHtml(c, c, f.clause); }).join('');

    return (
      '<div class="zws-findings-filters" role="group" aria-label="Finding filters">' +
        '<label class="zws-filter">' +
          '<span class="zws-filter-label">Severity</span>' +
          '<select data-zws-filter="severity" aria-label="Filter by severity">' + sevOpts + '</select>' +
        '</label>' +
        '<label class="zws-filter">' +
          '<span class="zws-filter-label">Review status</span>' +
          '<select data-zws-filter="review_status" aria-label="Filter by review status">' + revOpts + '</select>' +
        '</label>' +
        '<label class="zws-filter">' +
          '<span class="zws-filter-label">Clause</span>' +
          '<select data-zws-filter="clause" aria-label="Filter by clause">' + clauseOpts + '</select>' +
        '</label>' +
      '</div>'
    );
  }

  function renderFindingsList(visible) {
    if (!visible.length) {
      return '<p class="zws-findings-empty-inline">No findings match the current filters.</p>';
    }
    var html = '<ul class="zws-findings-list" role="listbox" aria-label="Findings">';
    visible.forEach(function (item) {
      var selected = item.finding_id === state.findings.selectedId;
      var evidenceCount = Array.isArray(item.evidence) ? item.evidence.length : 0;
      html +=
        '<li role="option" aria-selected="' + (selected ? 'true' : 'false') + '">' +
          '<button type="button" class="zws-finding-row' + (selected ? ' is-selected' : '') + '"' +
            ' data-zws-finding-id="' + escapeHtml(item.finding_id) + '"' +
            ' aria-label="' + escapeHtml((item.clause || 'Finding') + ', ' + (item.severity || '') + ', ' + (item.review_status || '')) + '">' +
            '<div class="zws-finding-row-top">' +
              '<span class="zws-finding-row-clause">' + escapeHtml(item.clause || '—') + '</span>' +
              reviewStatusBadgeHtml(item.review_status) +
            '</div>' +
            '<div class="zws-finding-row-mid">' +
              verdictPillHtml(item.severity) +
              '<span class="zws-finding-row-meta">' +
                escapeHtml(String(evidenceCount) + (evidenceCount === 1 ? ' evidence excerpt' : ' evidence excerpts')) +
              '</span>' +
            '</div>' +
            '<div class="zws-finding-row-summary">' + escapeHtml(item.summary || '') + '</div>' +
          '</button>' +
        '</li>';
    });
    html += '</ul>';
    return html;
  }

  function renderFindingsBody() {
    var st = state.findings;
    if (st.status === 'idle') {
      return '<p class="zws-llm-idle">Findings appear here after evaluation completes.</p>';
    }
    if (st.status === 'loading') {
      return (
        '<div class="zws-llm-loading">' +
          '<div class="zws-llm-spinner" aria-hidden="true"></div>' +
          '<div class="zws-llm-loading-msg">Loading findings…</div>' +
        '</div>'
      );
    }
    if (st.status === 'failed') {
      return '<div class="zws-llm-error">' + escapeHtml(st.error || 'Could not load findings.') + '</div>';
    }
    var items = st.items || [];
    if (!items.length) {
      return (
        '<div class="zws-findings-empty">' +
          '<div class="zws-findings-empty-title">No findings for this document</div>' +
          '<p class="zws-findings-empty-copy">The evaluation completed without triggered clause findings. Overview and other workspace panels remain available.</p>' +
        '</div>'
      );
    }
    var visible = filteredFindings();
    ensureFindingsSelection(visible);
    var selected = selectedFinding();
    return (
      renderFindingsFilters(items) +
      '<div class="zws-findings-layout">' +
        '<div class="zws-findings-list-pane">' +
          '<div class="zws-findings-count">' +
            escapeHtml(String(visible.length) + ' of ' + String(items.length) + ' finding' + (items.length === 1 ? '' : 's')) +
          '</div>' +
          renderFindingsList(visible) +
        '</div>' +
        '<div class="zws-findings-detail-pane" aria-live="polite">' +
          '<div class="zws-findings-detail-title">Finding detail</div>' +
          renderFindingsDetail(selected) +
        '</div>' +
      '</div>'
    );
  }

  function renderFindingsPanel() {
    if (!state.findingsEl) return;
    var expertToolbar = state.expert.url
      ? '<div class="zws-llm-actions">' + expertReviewActionHtml({ primary: false }) + '</div>'
      : '';
    state.findingsEl.innerHTML =
      '<section class="zws-findings" id="workspace-findings" aria-label="Findings and evidence">' +
        '<div class="zws-llm-head">' +
          '<div>' +
            '<div class="zws-llm-kicker">Findings / Evidence</div>' +
            '<h2 class="zws-llm-title">Clause findings</h2>' +
            '<p class="zws-llm-sub">Triggered findings from the evaluation report, with sentence-level evidence excerpts when available. Review status reflects existing expert feedback only.</p>' +
          '</div>' +
          expertToolbar +
        '</div>' +
        '<div class="zws-findings-body">' + renderFindingsBody() + '</div>' +
      '</section>';
    wireFindingsPanel();
  }

  function wireFindingsPanel() {
    if (!state.findingsEl) return;
    state.findingsEl.querySelectorAll('[data-zws-filter]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var key = sel.getAttribute('data-zws-filter');
        if (!key) return;
        state.findings.filters[key] = sel.value || 'ALL';
        renderFindingsPanel();
      });
    });
    state.findingsEl.querySelectorAll('[data-zws-finding-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.findings.selectedId = btn.getAttribute('data-zws-finding-id');
        renderFindingsPanel();
      });
    });
    state.findingsEl.querySelectorAll('[data-zws-expert-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        invokeExpertReview();
      });
    });
  }

  function resetFindingsPanel() {
    state.findings = {
      status: 'idle',
      error: null,
      items: null,
      selectedId: null,
      filters: { severity: 'ALL', review_status: 'ALL', clause: 'ALL' }
    };
    if (state.findingsEl) state.findingsEl.innerHTML = '';
  }

  function setExpertReview(opts) {
    opts = opts || {};
    state.expert.url = opts.url || null;
    state.expert.available = !!opts.available;
  }

  function resetExpertReview() {
    state.expert = { url: null, available: false };
  }

  function setFindingsState(patch) {
    patch = patch || {};
    Object.keys(patch).forEach(function (k) {
      if (k === 'filters' && patch.filters) {
        Object.keys(patch.filters).forEach(function (fk) {
          state.findings.filters[fk] = patch.filters[fk];
        });
      } else {
        state.findings[k] = patch[k];
      }
    });
    renderFindingsPanel();
  }

  function setFindingsData(payload) {
    var findings = (payload && Array.isArray(payload.findings)) ? payload.findings : [];
    state.findings.status = 'completed';
    state.findings.error = null;
    state.findings.items = findings;
    state.findings.selectedId = findings.length ? findings[0].finding_id : null;
    state.findings.filters = { severity: 'ALL', review_status: 'ALL', clause: 'ALL' };
    renderFindingsPanel();
  }

  function jobStatusHtml(status) {
    var labels = {
      idle: 'Idle',
      loading: 'Processing',
      completed: 'Completed',
      incomplete: 'Temporarily incomplete',
      failed: 'Failed'
    };
    return '<span class="zws-job-status zws-job-status--' + status + '">' +
      escapeHtml(labels[status] || status) + '</span>';
  }

  function fieldBlock(label, value) {
    if (!value) return '';
    return '<div class="zws-field"><div class="zws-field-label">' + escapeHtml(label) +
      '</div><div class="zws-field-body">' + escapeHtml(value) + '</div></div>';
  }

  function renderExplainBody() {
    var st = state.explain;
    if (!st.enabled) {
      return '<p class="zws-llm-idle">Explanation is not available for this verdict.</p>';
    }
    if (st.status === 'idle') {
      return '<p class="zws-llm-idle">Generate clause-level explanations for findings. Job status updates here after you start.</p>';
    }
    if (st.status === 'loading') {
      return (
        '<div class="zws-llm-loading">' +
          '<div class="zws-llm-spinner" aria-hidden="true"></div>' +
          '<div class="zws-llm-loading-msg">Generating explanation…</div>' +
          '<div class="zws-llm-loading-msg zws-llm-elapsed">' + escapeHtml(String(st.elapsedSec || 0)) + 's elapsed</div>' +
          (st.notice
            ? '<p class="zws-llm-notice" role="status">' + escapeHtml(st.notice) + '</p>'
            : '') +
        '</div>'
      );
    }
    if (st.status === 'incomplete') {
      return (
        '<div class="zws-llm-incomplete" role="status">' +
          escapeHtml(st.notice || 'This analysis is temporarily incomplete. You can retry when ready. Your evaluation verdict, findings, and evidence remain available.') +
        '</div>' +
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link" data-zws-explain-retry>Retry explanation</button>' +
        '</div>'
      );
    }
    if (st.status === 'failed') {
      return (
        '<div class="zws-llm-incomplete" role="status">' +
          escapeHtml(st.notice || 'This analysis is temporarily incomplete. You can retry when ready. Your evaluation verdict, findings, and evidence remain available.') +
        '</div>' +
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link" data-zws-explain-retry>Retry explanation</button>' +
        '</div>'
      );
    }
    var items = (st.data && st.data.explanations) || [];
    if (!items.length) {
      return '<p class="zws-llm-empty">No explanations were generated for this report.</p>';
    }
    var html = '';
    var hasDocumentFallback = items.some(function (item) { return item.scope === 'document'; });
    if (hasDocumentFallback) {
      html += '<p class="zws-llm-empty" style="margin-bottom:0.75rem">No clause-level explanation available. Document-level explanation is shown because no eligible clause findings were generated.</p>';
    }
    items.forEach(function (item) {
      var conf = item.E_confidence || {};
      var findingLabel = item.scope === 'document' ? 'Document-level' : (item.finding_id || 'finding');
      var riskText = state.documentRisk
        ? 'Document risk: ' + state.documentRisk + (item.verdict ? ' · Finding verdict: ' + item.verdict : '')
        : (item.verdict || '');
      var failureBlock = item.error
        ? fieldBlock('Explanation unavailable', item.error) +
          '<p class="zws-llm-empty" style="margin:0.25rem 0 0.75rem">Finding verdict remains unchanged. Use Retry explanation, or Expert Review.</p>' +
          '<div class="zws-llm-toolbar" style="margin-bottom:0.75rem">' +
            '<button type="button" class="zws-action-link" data-zws-explain-retry>Retry explanation</button>' +
          '</div>'
        : '';
      html +=
        '<article class="zws-finding-card">' +
          '<div class="zws-finding-head">' +
            '<span class="zws-finding-id">' + escapeHtml(findingLabel) + '</span>' +
            (item.verdict ? verdictPillHtml(item.verdict) : '') +
          '</div>' +
          fieldBlock('Finding context', findingLabel + (item.scope ? ' · scope: ' + item.scope : '')) +
          failureBlock +
          fieldBlock('Regulatory reason', item.C_regulatory_interpretation || item.A_why) +
          fieldBlock('Evidence', item.B_evidence_mapping) +
          fieldBlock('Risk', riskText) +
          fieldBlock('Recommended action', item.D_practical_recommendation) +
          fieldBlock('Why (A)', item.A_why && item.C_regulatory_interpretation ? item.A_why : null) +
          (conf.confidence_score != null && !item.error
            ? fieldBlock('Confidence', 'Score: ' + String(conf.confidence_score) +
              (conf.basis ? ' · Basis: ' + conf.basis : '') +
              (conf.limitation ? ' · Limitation: ' + conf.limitation : ''))
            : '') +
        '</article>';
    });
    return html;
  }

  function renderRedraftBody() {
    var st = state.redraft;
    if (!st.enabled) {
      return '<p class="zws-llm-idle">Redraft is not available for this verdict.</p>';
    }
    if (st.status === 'idle') {
      return '<p class="zws-llm-idle">Generate suggested redrafts for clause gaps. Comparison appears here when complete.</p>';
    }
    if (st.status === 'loading') {
      return (
        '<div class="zws-llm-loading">' +
          '<div class="zws-llm-spinner" aria-hidden="true"></div>' +
          '<div class="zws-llm-loading-msg">Generating redraft…</div>' +
          '<div class="zws-llm-loading-msg zws-llm-elapsed">' + escapeHtml(String(st.elapsedSec || 0)) + 's elapsed</div>' +
          (st.notice
            ? '<p class="zws-llm-notice" role="status">' + escapeHtml(st.notice) + '</p>'
            : '') +
        '</div>'
      );
    }
    if (st.status === 'incomplete') {
      return (
        '<div class="zws-llm-incomplete" role="status">' +
          escapeHtml(st.notice || 'This analysis is temporarily incomplete. You can retry when ready. Your evaluation verdict, findings, and evidence remain available.') +
        '</div>' +
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link" data-zws-redraft-retry>Retry redraft</button>' +
        '</div>'
      );
    }
    if (st.status === 'failed') {
      return (
        '<div class="zws-llm-incomplete" role="status">' +
          escapeHtml(st.notice || 'This analysis is temporarily incomplete. You can retry when ready. Your evaluation verdict, findings, and evidence remain available.') +
        '</div>' +
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link" data-zws-redraft-retry>Retry redraft</button>' +
        '</div>'
      );
    }
    var items = (st.data && st.data.redrafts) || [];
    if (!items.length) {
      return '<p class="zws-llm-empty">No redrafts were generated for the selected clauses.</p>';
    }
    var sourceFallback = st.sourceContext || '';
    var html = '';
    items.forEach(function (item, idx) {
      var originalText = sourceFallback;
      var originalNote = !originalText
        ? 'Original source excerpt is not returned by the redraft API. Document evidence signals (if any) are shown when available from the evaluation report.'
        : '';
      html +=
        '<article class="zws-finding-card" data-redraft-idx="' + idx + '">' +
          '<div class="zws-finding-head">' +
            '<span class="zws-finding-id">Clause ' + escapeHtml(item.clause_id || '') + '</span>' +
            (item.clause_title ? '<span style="font-size:0.82rem;color:var(--zws-text-secondary)">' + escapeHtml(item.clause_title) + '</span>' : '') +
            (item.finding_level ? verdictPillHtml(item.finding_level) : '') +
          '</div>' +
          '<div class="zws-compare">' +
            '<div class="zws-compare-col">' +
              '<div class="zws-compare-label">Original / source context</div>' +
              (originalText
                ? '<div class="zws-compare-text">' + escapeHtml(originalText) + '</div>'
                : '<div class="zws-compare-text zws-compare-text--muted">' + escapeHtml(originalNote) + '</div>') +
            '</div>' +
            '<div class="zws-compare-col">' +
              '<div class="zws-compare-label">Proposed redraft</div>' +
              '<div class="zws-compare-text">' + escapeHtml(item.ai_draft_text || '') + '</div>' +
            '</div>' +
          '</div>' +
          (item.disclaimer
            ? '<div class="zws-disclaimer"><div class="zws-field-label">Rationale / disclaimer</div>' + escapeHtml(item.disclaimer) + '</div>'
            : '') +
          '<div class="zws-redraft-actions">' +
            '<button type="button" class="zws-action-link" data-zws-copy-redraft="' + idx + '"' +
              (item.ai_draft_text ? '' : ' disabled') + '>Copy redraft</button>' +
            '<button type="button" class="zws-action-link" data-zws-download-redraft>Download JSON</button>' +
          '</div>' +
        '</article>';
    });
    return html;
  }

  function renderLlmPanels() {
    if (!state.llmEl) return;
    var explainEnabled = state.explain.enabled;
    var redraftEnabled = state.redraft.enabled;
    if (!explainEnabled && !redraftEnabled && state.evaluationStatus !== 'complete') {
      state.llmEl.innerHTML = '';
      return;
    }

    var explainToolbar = '';
    if (state.explain.enabled && (state.explain.status === 'idle' || state.explain.status === 'completed')) {
      explainToolbar =
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link zws-action-link--primary" data-zws-explain-start>' +
            (state.explain.status === 'completed' ? 'Run explanation again' : 'Generate explanation') +
          '</button>' +
        '</div>';
    }

    var redraftToolbar = '';
    if (state.redraft.enabled && (state.redraft.status === 'idle' || state.redraft.status === 'completed')) {
      redraftToolbar =
        '<div class="zws-llm-toolbar">' +
          '<button type="button" class="zws-action-link zws-action-link--primary" data-zws-redraft-start>' +
            (state.redraft.status === 'completed' ? 'Run redraft again' : 'Generate redraft') +
          '</button>' +
        '</div>';
    }

    state.llmEl.innerHTML =
      '<div class="zws-llm" id="workspace-llm">' +
        '<section class="zws-llm-panel" id="zws-explain-panel" aria-label="Explanation workspace">' +
          '<div class="zws-llm-panel-header">' +
            '<div>' +
              '<div class="zws-llm-panel-title">Explanation</div>' +
              '<div class="zws-llm-panel-sub">Finding context, regulatory reason, evidence, risk, recommended action</div>' +
            '</div>' +
            jobStatusHtml(state.explain.enabled ? state.explain.status : 'idle') +
          '</div>' +
          explainToolbar +
          '<div class="zws-llm-body">' + renderExplainBody() + '</div>' +
        '</section>' +
        '<section class="zws-llm-panel" id="zws-redraft-panel" aria-label="Redraft workspace">' +
          '<div class="zws-llm-panel-header">' +
            '<div>' +
              '<div class="zws-llm-panel-title">Redraft</div>' +
              '<div class="zws-llm-panel-sub">Original vs proposed comparison · copy / download where supported</div>' +
            '</div>' +
            jobStatusHtml(state.redraft.enabled ? state.redraft.status : 'idle') +
          '</div>' +
          redraftToolbar +
          '<div class="zws-llm-body">' + renderRedraftBody() + '</div>' +
        '</section>' +
      '</div>';

    bindLlmEvents();
  }

  function bindLlmEvents() {
    if (!state.llmEl) return;
    state.llmEl.querySelectorAll('[data-zws-explain-start], [data-zws-explain-retry]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof state.onExplainRequest === 'function') state.onExplainRequest();
      });
    });
    state.llmEl.querySelectorAll('[data-zws-redraft-start], [data-zws-redraft-retry]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof state.onRedraftRequest === 'function') state.onRedraftRequest();
      });
    });
    state.llmEl.querySelectorAll('[data-zws-copy-redraft]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-zws-copy-redraft'), 10);
        var items = (state.redraft.data && state.redraft.data.redrafts) || [];
        var text = (items[idx] && items[idx].ai_draft_text) || '';
        if (typeof state.onCopyRedraft === 'function') state.onCopyRedraft(text, idx);
      });
    });
    state.llmEl.querySelectorAll('[data-zws-download-redraft]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof state.onDownloadRedraft === 'function') state.onDownloadRedraft();
      });
    });
  }

  function setExplainState(patch) {
    patch = patch || {};
    Object.keys(patch).forEach(function (k) { state.explain[k] = patch[k]; });
    renderLlmPanels();
  }

  function setRedraftState(patch) {
    patch = patch || {};
    Object.keys(patch).forEach(function (k) { state.redraft[k] = patch[k]; });
    renderLlmPanels();
  }

  function resetLlmPanels() {
    state.explain = { status: 'idle', enabled: false, error: null, notice: null, elapsedSec: 0, data: null };
    state.redraft = { status: 'idle', enabled: false, error: null, notice: null, elapsedSec: 0, data: null, sourceContext: null };
    state.documentRisk = null;
    if (state.llmEl) state.llmEl.innerHTML = '';
  }

  function init(options) {
    options = options || {};
    state.mountEl = document.getElementById(options.mountId || 'zws-mount');
    state.overviewEl = document.getElementById(options.overviewId || 'workspace-overview-mount');
    state.llmEl = document.getElementById(options.llmId || 'workspace-llm-mount');
    state.findingsEl = document.getElementById(options.findingsId || 'workspace-findings-mount');
    state.onPlaceholderNav = options.onPlaceholderNav || null;
    state.onExitSandbox = options.onExitSandbox || null;
    state.onExplainRequest = options.onExplainRequest || null;
    state.onRedraftRequest = options.onRedraftRequest || null;
    state.onCopyRedraft = options.onCopyRedraft || null;
    state.onDownloadRedraft = options.onDownloadRedraft || null;
    state.onExpertReview = options.onExpertReview || null;
    state.onExpertReviewInfo = options.onExpertReviewInfo || null;
    state.activeNav = options.activeNav || 'workspace';
    document.body.classList.add('zws-shell-active');
    renderShell();
    if (options.initialMode === 'auth') {
      renderOverviewAuth();
    } else if (options.initialMode === 'upload') {
      renderOverviewUpload();
    }
  }

  function setContext(ctx) {
    ctx = ctx || {};
    if (ctx.documentName !== undefined) state.documentName = ctx.documentName;
    if (ctx.documentType !== undefined) state.documentType = ctx.documentType;
    if (ctx.evaluationStatus !== undefined) state.evaluationStatus = ctx.evaluationStatus;
    if (ctx.verdict !== undefined) state.verdict = ctx.verdict;
    if (ctx.documentRisk !== undefined) state.documentRisk = ctx.documentRisk;
    renderShell();
  }

  function setActiveNav(navId) {
    state.activeNav = navId || 'workspace';
    renderShell();
  }

  function showOverviewMode(mode) {
    if (mode === 'auth') {
      resetExpertReview();
      resetFindingsPanel();
      resetLlmPanels();
      renderOverviewAuth();
    } else if (mode === 'upload') {
      resetExpertReview();
      resetFindingsPanel();
      resetLlmPanels();
      renderOverviewUpload();
    } else if (mode === 'evaluating') {
      resetExpertReview();
      resetFindingsPanel();
      resetLlmPanels();
      renderOverviewEvaluating();
    }
  }

  function parseDocumentTypeFromReport(reportData) {
    if (!reportData) return null;
    var trace = reportData.evidence_trace || [];
    for (var i = 0; i < trace.length; i++) {
      var m = /^document_type=(.+)$/.exec(String(trace[i]));
      if (m) return m[1];
    }
    return null;
  }

  function enableLlmForResult(opts) {
    opts = opts || {};
    state.documentRisk = opts.documentRisk || null;
    state.explain.enabled = !!opts.showExplain;
    state.explain.status = 'idle';
    state.explain.error = null;
    state.explain.data = null;
    state.explain.elapsedSec = 0;
    state.redraft.enabled = !!opts.showRedraft;
    state.redraft.status = 'idle';
    state.redraft.error = null;
    state.redraft.data = null;
    state.redraft.elapsedSec = 0;
    state.redraft.sourceContext = opts.sourceContext || null;
    renderLlmPanels();
  }

  global.WorkspaceShell = {
    init: init,
    setContext: setContext,
    setActiveNav: setActiveNav,
    showOverviewMode: showOverviewMode,
    renderOverviewResult: renderOverviewResult,
    parseDocumentTypeFromReport: parseDocumentTypeFromReport,
    setExplainState: setExplainState,
    setRedraftState: setRedraftState,
    resetLlmPanels: resetLlmPanels,
    enableLlmForResult: enableLlmForResult,
    scrollToLlmPanel: scrollToLlmPanel,
    setFindingsState: setFindingsState,
    setFindingsData: setFindingsData,
    resetFindingsPanel: resetFindingsPanel,
    scrollToFindings: scrollToFindings,
    setExpertReview: setExpertReview,
    resetExpertReview: resetExpertReview,
    NAV_ITEMS: NAV_ITEMS
  };
})(window);
