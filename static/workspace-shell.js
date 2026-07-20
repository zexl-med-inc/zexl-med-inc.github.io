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
    onPlaceholderNav: null,
    onExitSandbox: null,
    activeNav: 'workspace',
    documentName: null,
    documentType: null,
    evaluationStatus: 'idle',
    verdict: null
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
          '<button type="button" class="' + explainCls + '" id="zws-link-explain"' + explainDis + '>Explanation</button>' +
          '<button type="button" class="' + redraftCls + '" id="zws-link-redraft"' + redraftDis + '>Redraft</button>' +
          '<button type="button" class="' + expertCls + '" id="zws-link-expert"' + expertDis + '>' + escapeHtml(expertLabel) + '</button>' +
        '</div>' +
      '</section>';

    var explainBtn = state.overviewEl.querySelector('#zws-link-explain');
    var redraftBtn = state.overviewEl.querySelector('#zws-link-redraft');
    var expertBtn = state.overviewEl.querySelector('#zws-link-expert');

    if (explainBtn && showExplain) {
      explainBtn.addEventListener('click', function () {
        var target = document.getElementById('llm-workflow');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var btn = document.getElementById('explain-btn');
        if (btn && !btn.disabled && typeof global.startExplanation === 'function') {
          /* scroll only — preserve existing entry point; user may click Explain in LLM block */
        }
      });
    }
    if (redraftBtn && showRedraft) {
      redraftBtn.addEventListener('click', function () {
        var target = document.getElementById('llm-workflow');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (expertBtn && showExpert) {
      expertBtn.addEventListener('click', function () {
        var legacy = document.getElementById('expert-review-btn');
        if (legacy && typeof legacy.onclick === 'function') {
          legacy.onclick();
        }
      });
    }
  }

  function init(options) {
    options = options || {};
    state.mountEl = document.getElementById(options.mountId || 'zws-mount');
    state.overviewEl = document.getElementById(options.overviewId || 'workspace-overview-mount');
    state.onPlaceholderNav = options.onPlaceholderNav || null;
    state.onExitSandbox = options.onExitSandbox || null;
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
    renderShell();
  }

  function setActiveNav(navId) {
    state.activeNav = navId || 'workspace';
    renderShell();
  }

  function showOverviewMode(mode) {
    if (mode === 'auth') renderOverviewAuth();
    else if (mode === 'upload') renderOverviewUpload();
    else if (mode === 'evaluating') renderOverviewEvaluating();
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

  global.WorkspaceShell = {
    init: init,
    setContext: setContext,
    setActiveNav: setActiveNav,
    showOverviewMode: showOverviewMode,
    renderOverviewResult: renderOverviewResult,
    parseDocumentTypeFromReport: parseDocumentTypeFromReport,
    NAV_ITEMS: NAV_ITEMS
  };
})(window);
