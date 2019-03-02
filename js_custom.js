// ==UserScript==
// @name         jira-custom-modification
// @namespace    http://tampermonkey.net/
// @version      0.4.22
// @description  add some additional features for JIRA
// @author       T. Hinze
// @match        https://positivmultimedia.atlassian.net/*
// @grant        none
// @update       https://raw.githubusercontent.com/thinze/jira-custom-modification/master/js_custom.js
// ==/UserScript==

(function() {
    'use strict';

    // --- settings ---
    var js_version              = '0.4.22';
    var js_debug                = 1;
    var watcher1, watcher2;

    // config
    var show_full_proj_title    = 1;
    var mark_service_proj	    = 1;
    var done_stati              = ['erledigt', 'geschlossen'];

    // --- config vars ---
    var cfg                     = {};
    if (true) {

        var setup_options = {
            colored_tasks   : {type: 'bool',    label: 'Tasks färben',          val: 1},
            color_ups       : {type: 'color',   label: 'Service-Proj.',         val: 'red'},
            color_day2      : {type: 'color',   label: 'in 2 Tagen',            val: 'lightblue'},
            color_day1      : {type: 'color',   label: 'in 1 Tagen',            val: 'orange'},
            color_day0      : {type: 'color',   label: 'heute',                 val: 'magenta'},
            color_over      : {type: 'color',   label: 'überlaufen',            val: 'red'},
            old_issue_view  : {type: 'bool',    label: 'alte Task-Ansicht',     val: 1},
            warn_ups        : {type: 'bool',    label: 'markiere Service-Proj.',val: 0},
            show_projectname: {type: 'bool',    label: 'zeige Projektname',     val: 0},
            quick_search    : {type: 'bool',    label: 'Schnellsuche',          val: 1},
            quick_actions   : {type: 'bool',    label: 'Quick-Actions',         val: 1},
            version         : {type: 'readonly',label: 'Version',               val: '?'}
        };

    }

    // --- observer ---
    var sidebar_ro =  new ResizeObserver( entries => {
        for (let entry of entries) {
            var cr = entry.contentRect;
            updateQuickSearch(entry.target);
        }
    });

    // --- HTML snippets ---
    if (true) {

        var cfg_html = '<button id="my-jira-cfg-btn">+</button><div id="my-jira-cfg-settings">' +
            '<nav id="my-jira-cfg-menu">' +
            '<span id="goto-my-jira-cfg-dashbaord" class=" active">Dashboard</span>' +
            '<span id="goto-my-jira-cfg-tasks">Tasks</span>' +
            '<span id="goto-my-jira-cfg-misc">Misc</span>' +
            '</nav>' +
            '<fieldset id="my-jira-cfg-dashbaord" class="cfg-section active"><div class="inner"><h3>Dashboard-Setting</h3></div></fieldset>' +
            '<fieldset id="my-jira-cfg-tasks" class="cfg-section"><div class="inner"><h3>Tasks Settings</h3></div></fieldset>' +
            '<fieldset id="my-jira-cfg-misc" class="cfg-section"><div class="inner"><h3>Misc Settings</h3></div><button id="my-jira-cfg-help">Help</button></fieldset>' +
            '</div>';

        var spinner = '<div class="jira-page-loading-indicator my-jira-spiner"></div>';
    }

    // --- stylesheets ---
    if (true) {

        var menu_width = '100px';

        var cfg_css = '' +
            '#my-jira-cfg-dialog { position: fixed; top: 0; z-index: 9999; } ' +
            '#my-jira-cfg-btn { width: 24px; height: 24px; background: #444; color: #ccc; margin: 1px; } ' +
            '#my-jira-cfg-btn:hover { background: #999; color: #fff; } ' +
            '#my-jira-cfg-btn.open { background: lightgreen; color: #fff; width: 24px; height: 24px; } ' +
            '#my-jira-cfg-settings { background: #444; border: 1px solid #ccc; display: none; position: relative; padding-left: ' + menu_width + '; } ' +
            '#my-jira-cfg-settings.open { display: block; } ' +
            '#my-jira-cfg-menu { background: #666; width: ' + menu_width + '; position: absolute; top: 0; left: 0; border-right: 1px solid #999; height: 100%; } ' +
            '#my-jira-cfg-menu span { color: #fff; display: block; padding: 4px 2px; margin: 0 0 5px; border-bottom: 1px solid #aaa; } ' +
            '#my-jira-cfg-menu span.active, ' +
            '#my-jira-cfg-menu span:hover { background: #ccc; color: #000; cursor: pointer; } ' +
            '#my-jira-cfg-menu #my-jira-cfg-save { background: #aaa; color: #000; cursor: pointer; position: absolute; bottom: 0; left: 0; width: 100%; } ' +
            '#my-jira-cfg-menu #my-jira-cfg-save:hover { background: #ccc; color: #333; cursor: pointer; } ' +
            '#my-jira-cfg-menu #my-jira-cfg-save.saved { background: lightgreen; color: #fff; } ' +
            '#my-jira-cfg-settings fieldset { display: none; min-width: 200px; min-height: 160px; color: #ccc; } ' +
            '#my-jira-cfg-settings fieldset.active { display: block; } ' +
            '#my-jira-cfg-settings fieldset .inner { padding: 3px 5px; } ' +
            '#my-jira-cfg-settings fieldset .inner h3 { color: #ccc; font-size: 110%; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 5px; } ' +
            '#my-jira-cfg-settings fieldset .opt-row { margin: 0 0 5px; } ' +
            '#my-jira-cfg-settings fieldset .opt-row label { display: inline-block; width: 100px; } ' +
            '#my-jira-cfg-settings fieldset .opt-row input.color { display: inline-block; width: 30px; height: 20px; background: transparent; } ' +
            '#my-jira-cfg-settings fieldset .opt-row input.bool { display: inline-block; width: 16px; } ' +
            '#my-jira-cfg-settings fieldset .opt-row input.text { display: inline-block; width: 80px; } ' +
            '#my-jira-cfg-help { margin: 0 auto; width: 90%; display: block; } ' +
            '#my-jira-cfg-help:hover {  background: #999; color: #fff; } ' +
            '';

        var action_css = '' +
            '#page-body .my-jira-logobox { padding-top: 85px; } ' +
            '#my-jira-quick-actions { position:fixed; background:rgba(0, 0, 0, 0.65); padding:5px; z-index:99999; top:5px; left:64px; ' +
            '  /* transform:translate(-50%, 0); */ }' +
            '#my-jira-quick-actions.hide { display: none; }' +
            '#my-jira-dashboard-actions { }' +
            '#my-jira-dashboard-actions h6 { color: #ccc; margin: -5px 0 5px; padding: 0; } ' +
            '#my-jira-dashboard-actions .row {}' +
            '#my-jira-dashboard-actions .row button { font-size:90%; margin:1px; }' +
            '#my-jira-dashboard-actions .row button:hover { background:green; color:#fff; }' +
            '#my-jira-dashboard-actions .row button:active { background:black; }' +
            ' ';

        var css = action_css + cfg_css +
            '#issuetype-single-select, div#project-single-select { max-width: none; width: 600px; } ' +
            '#issuetype-single-select > input, div#project-single-select > input { max-width: none; } ' +
            '#content #project_container .aui-ss-field#project-field { max-width: none !important; width: 600px; background: red; } ' +
            '#quick-search-field { display: inline-block; position: fixed; z-index: 99999; top: 65px; left: 64px; /* transform:translateX(-50%); */ ' +
            '        width: 235px; max-width: none; background: #eee; padding: 2px; } ' +
            '#quick-search-field.filtering { background: lightgreen; } ' +
            '#quick-search-clear { display: inline-block; position: fixed; width: 235px; max-width: none; top: 65px; left: 64px; /* transform: translateX(-50%); */ ' +
            '        height: 1em; background: darkred; margin-left: 1em; z-index: 99998; padding: 3px; } ' +
            '#quick-search-clear:hover { cursor: pointer; } ' +
            '#issuetable tr.tr-off, .gadget tr.tr-off { display: none !important; } ' +
            '';
    }

    // ===============  helper ==================

    /**
     * debug output function
     */
    function _debug(txt) {
        if (js_debug) {
            var d = new Date();
            var now = [d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()].join(':');
            console.log(now + ': ' + txt);
        }
    }

    /**
     * change german month shortnames to english representation
     *
     * @param txt
     * @returns {Date}
     */
    function getStandardDate(txt) {
        txt = txt.trim();
        // replace german month shortnames with english ones
        txt = txt.replace('Mär', 'Mar').replace('Mai', 'May').replace('Okt', 'Oct').replace('Dez', 'Dec');
        return new Date(txt);
    }

    /**
     * insert custom CSS
     *
     */
    function insertCss(css, css_id) {
        var style   = document.createElement('STYLE');
        if (css_id) {
            style.id = css_id;
        }
        style.innerHTML = css;
        document.querySelector('head').appendChild(style);
    }

    /**
     * set multiple styles on an element
     *
     * @param elem      DOM node
     * @param styles    key-value array {width: 'auto', height: 'auto', ... }
     */
    function setStylesOnElement(elem, styles){
        Object.assign(elem.style, styles);
    }

    /**
     * update gadgets height and width
     *
     * The trick is: minimize and maximize #page-body to force the gadget-update-method (of JIRA)
     */
    function updateGadgets() {
        setStylesOnElement(document.querySelector('#page-body'), {width: '0px', minWidth: 'inherit'});
        window.setTimeout(function() { // little bit delay before change styles again
            setStylesOnElement(document.querySelector('#page-body'), {width: 'auto', minWidth: 'fit-content'});
        }, 1);
    }

    /**
     * open a new tab and set the focus
     * @param url
     */
    function openNewTab(url) {
        var win = window.open(url, '_blank');
        win.focus();
    }

    // =============== config dialog ===============

    /**
     * save config to loacal storage
     *
     * @param cfg
     * @returns {boolean}
     */
    function saveConfig(data) {
        var success = false;
        if (typeof data == 'object') {
            localStorage.setItem('my-jira-cfg', JSON.stringify(data));
            success = true;
            _debug('cfg saved');
        }
        return success;
    }

    /**
     * load config from local storage
     */
    function loadConfig() {
        var success = false;
        var data;
        try {
            data = JSON.parse(localStorage.getItem('my-jira-cfg'));
            if (data === null) {
                throw "cfg loading error";
            }
            success = true;
            _debug('cfg loaded');
        }
        catch(err) {
            // stored cfg incorrect -> save and use default values
            for (var property in setup_options) {
                var val = setup_options[property]['val'];
                cfg[property] = val;
            }
            saveConfig(cfg);
            success = false;
            _debug('cfg loading failed - use default settings');
        }
        cfg = data;
        return success;
    }

    function initSetupDialog() {
        var nav = document.querySelector('#navigation-app');
        var div = document.createElement('DIV');
        div.id  = 'my-jira-cfg-dialog';
        div.innerHTML = cfg_html.trim();
        if (nav) {
            nav.appendChild(div);
            document.querySelector('#my-jira-cfg-btn').addEventListener('click', toggleCfgDialog);
            var items = document.querySelectorAll('#my-jira-cfg-menu span');
            items.forEach(function (elem) {
                elem.addEventListener('click', switchCfgSections)
            });
            buildCfgOptions();
            updateCfgSections();
        }
    }

    /**
     * toggle the complete cfg dialog
     */
    function toggleCfgDialog() {
        var elem = document.querySelector('#my-jira-cfg-settings');
        if (elem.className.indexOf(' open') == -1) {
            elem.className += ' open';
            hideQuickActions();
        } else {
            elem.className = elem.className.replace(' open', '');
            showQuickActions();
        }
    }

    /**
     * switch the cfg dialogs by menu item click
     * @param e
     */
    function switchCfgSections(e) {
        var clicked = e.target;
        // enable selected nav item
        document.querySelectorAll('#my-jira-cfg-menu span').forEach(function(elem) { // dis-active all nav-items
            elem.className = elem.className.replace(' active', '');
        });
        clicked.className += ' active';

        // enable selected section
        document.querySelectorAll('#my-jira-cfg-settings fieldset').forEach(function(elem) {   // dis-active all sections
            elem.className = elem.className.replace(' active', '');
        });
        // select corresponding elem for clicked element (i.e. #goto-abc-xyz -> #abc-xyz)
        document.querySelector('#' + clicked.id.replace('goto-', '')).className += ' active';
    }

    /**
     * create a option field
     * @param property
     * @param container
     */
    function createCfgOption(property, container) {
        if (container) {
            if (setup_options.hasOwnProperty(property)) {
                var lbl         = document.createElement('LABEL');
                var elem        = document.createElement('INPUT');
                lbl.htmlFor     = property;
                lbl.innerHTML   = setup_options[property]['label'];
                elem.id         = 'cfg-' + property;
                switch (setup_options[property]['type']) {
                    case 'bool':
                        elem.type = 'checkbox';
                        elem.className = 'bool';
                        elem.dataset.cfg_type = 'bool';
                        break;
                    case 'color':
                        elem.type = 'color';
                        elem.className = 'color';
                        elem.dataset.cfg_type = 'color';
                        break;
                    case 'text':
                        elem.type = 'text';
                        elem.className = 'text';
                        elem.dataset.cfg_type = 'text';
                        break;
                    case 'readonly':
                        elem = document.createElement('SPAN');
                        elem.className = 'field-readonly';
                        elem.innerText = js_version;
                        break;
                }
                elem.addEventListener('change', instantSaveCfgOption);
                var row = document.createElement('DIV');
                row.className = 'opt-row';
                row.appendChild(lbl);
                row.appendChild(elem);
                container.appendChild(row);
            }
        }
    }

    /**
     * save instant the config value after element has changed
     * @param e
     */
    function instantSaveCfgOption(e) {
        var val;
        var elem = e.target;
        if (elem) {
            switch (elem.dataset.cfg_type) {
                case 'bool':
                    if (elem.checked) {
                        val = 1;
                    } else {
                        val = 0;
                    }
                    cfg[elem.id.replace('cfg-', '')] = val;
                    break;

                case 'color':
                    cfg[elem.id.replace('cfg-', '')] = elem.value;
                    break;

                case 'text':
                    cfg[elem.id.replace('cfg-', '')] = elem.value;
                    break;
            }
            saveConfig(cfg);
        }
    }

    /**
     * build all config options in separte sections
     */
    function buildCfgOptions() {
        var sec;
        var cfg_sec = document.querySelector('#my-jira-cfg-settings');
        if (cfg_sec) {
            sec = document.querySelector('#my-jira-cfg-dashbaord .inner');
            if (sec) {
                createCfgOption('quick_actions', sec);
                createCfgOption('quick_search', sec);
                createCfgOption('warn_ups', sec);
                createCfgOption('color_ups', sec);
            }
            sec = document.querySelector('#my-jira-cfg-tasks .inner');
            if (sec) {
                createCfgOption('colored_tasks', sec);
                createCfgOption('color_over', sec);
                createCfgOption('color_day0', sec);
                createCfgOption('color_day1', sec);
                createCfgOption('color_day2', sec);
                createCfgOption('old_issue_view', sec);
                createCfgOption('show_projectname', sec);
            }
            sec = document.querySelector('#my-jira-cfg-misc .inner');
            if (sec) {
                // add fields here
                document.querySelector('#my-jira-cfg-help').addEventListener('click',
                    function() {
                        openNewTab('https://github.com/thinze/jira-custom-modification/blob/master/HELP.md');
                    }
                );
                createCfgOption('version', sec);
            }
        }
    }

    /**
     * update all config options with stored values
     */
    function updateCfgSections() {
        var cfg_sec = document.querySelector('#my-jira-cfg-settings');
        if (cfg_sec) {
            for (var property in setup_options) {
                var opt = document.querySelector('#cfg-' + property);
                if (opt) {
                    switch (opt.dataset.cfg_type) {
                        case 'bool':
                            if (cfg[property]) {
                                opt.checked = 'checked';
                            } else {
                                opt.checked = '';
                            }
                            break;
                        case 'color':
                            if (cfg[property]) {
                                opt.value = cfg[property];
                            } else {
                                opt.value = '';
                            }
                            break;
                        case 'text':
                            break;
                    }
                }
            }
        }
    }

    // ================ quick actions ==============

    /**
     * wait until sidebar logo exists and then add the quick-actions
     */
    function waitForSidebar() {
        var logo_box = document.querySelector('.css-79elbk');
        if (logo_box) {
            window.clearInterval(watcher2);
            addQuickActions();

        } else {
            // do nothing beacause it will be called again via interval
        }
    }

    /**
     * add container for quick-actions
     */
    function addQuickActions() {
        var container = document.createElement('DIV');
        container.id  = 'my-jira-quick-actions';
        document.querySelector('body').appendChild(container);
        // move sidebar downward
        var logo_box = document.querySelector('.css-cm9zc8');
        logo_box.className += ' my-jira-logobox';
        // add actions
        addDashboardQuickActions();
        addQuickSearch();

        // close quick-actions if the sidebar is minimized
        var btn = document.querySelector('button.css-qm60v3');
        if (btn) {
            btn.addEventListener('click', toggleDashboardQuickActions);
        }

        // init method to observe the sidebar resize
        sidebar_ro.observe(logo_box.parentNode);
    }

    /**
     * hide the quick-actions
     */
    function hideQuickActions() {
        var qa = document.querySelector('#my-jira-quick-actions');
        if (qa) {
            qa.className = qa.className.replace(' hide', '') + ' hide';
        }
    }

    /**
     * show the quick-actions
     */
    function showQuickActions() {
        var qa = document.querySelector('#my-jira-quick-actions');
        if (qa) {
            qa.className = qa.className.replace(' hide', '');
        }
    }

    /**
     * update quick actions after resize the sidebar
     */
    function updateQuickSearch(elem) {
        var qa = document.querySelector('#my-jira-quick-actions');
        var sidebar = document.querySelector('.css-cm9zc8').parentNode;
        var search = document.querySelector('#quick-search-field');
        var clean = document.querySelector('#quick-search-clear');
        if (qa && search && clean) {
            showQuickActions();
            var new_width = sidebar.offsetWidth - 20;
            if (new_width < 140) { // hide quick-actions
                hideQuickActions();

            } else {
                search.style.width = new_width + 'px';
                clean.style.width = new_width + 'px';
            }

        } else {
            // sidebar not open - hide quick-actions
            // hideQuickActions();
        }
    }

    /**
     * enable/disable quick-actions incl. quick-search
     */
    function toggleDashboardQuickActions() {
        var qa = document.querySelector('#my-jira-quick-actions');
        if (qa) {
            var logo_box = document.querySelector('.css-cm9zc8');
            var sidebar_open = document.querySelector('.css-1ufv8rh .css-1sjc3tg')
            if (sidebar_open) {
                _debug('sidebar is open');
                if (qa.className.indexOf('hide') == -1) { // quick-actions visible
                    qa.className = qa.className.replace(' hide', '') + ' hide';
                } else { // quick-actions not visible
                    qa.className = qa.className.replace(' hide', '');
                }
            } else {
                _debug('sidebar is closed');
                qa.className = qa.className.replace(' hide', '') + ' hide';
            }
        }
    }

    /**
     * add quick-actions to the dashboard
     */
    function addDashboardQuickActions() {
        if (cfg && cfg.quick_actions) {
            var dashboard = document.querySelector('#dashboard-content');
            if (dashboard) {
                // create actions
                var html = '' +
                    '<h6>Actions</h6>' +
                    '<div class="row">' +
                    '<button id="widgets-collapse" data-callback="widgetsCollapseAll" class="action">collapse</button><button id="widgets-expand" data-callback="widgetsExpandAll" class="action">expand</button>' +
                    '</div>';
                var div = document.createElement('DIV');
                div.id = 'my-jira-dashboard-actions';
                div.innerHTML = html.trim();
                // add new actions to the document
                document.querySelector('#my-jira-quick-actions').appendChild(div);
                // bind actions
                document.querySelector('#my-jira-dashboard-actions #widgets-collapse').addEventListener('click', widgetsCollapseAll);
                document.querySelector('#my-jira-dashboard-actions #widgets-expand').addEventListener('click', widgetsExpandAll);
            }
        }
    }

    /**
     * collapse all expanded gadgets
     */
    function widgetsCollapseAll() {
        var widgets = document.querySelectorAll('.dashboard-item-content');
        widgets.forEach(function(item, idx) {
            if (item.className.indexOf(' minimization') == -1) {
                item.className = item.className + ' minimization';
                item.previousSibling.querySelector('.dashboard-item-title').dispatchEvent(new Event('dblclick'));
            }
        });
    }

    /**
     * expand all collapsed gadgets
     */
    function widgetsExpandAll() {
        var widgets = document.querySelectorAll('.dashboard-item-content.minimization');
        widgets.forEach(function(item, idx) {
            item.className = item.className.replace(' minimization', '');
            item.previousSibling.querySelector('.dashboard-item-title').dispatchEvent(new Event('dblclick'));
        });
        updateGadgets();
    }

    /**
     * add quick search field to instant-filtering
     */
    function addQuickSearch() {
        if (cfg && cfg.quick_search) {
            var quick_actions = document.querySelector('#my-jira-quick-actions');
            var dashboard = document.querySelector('#dashboard-content');
            var navigator = document.querySelector('#content .navigator-body');
            if (quick_actions && (dashboard || navigator)) {
                var search = document.createElement('INPUT');
                var clean = document.createElement('SPAN');
                search.id = 'quick-search-field';
                clean.id = 'quick-search-clear';
                quick_actions.appendChild(search);
                quick_actions.appendChild(clean);
                updateQuickSearch();

                search.addEventListener('keyup',
                    function (e) {
                        var field = e.target;
                        var word = field.value.toLowerCase();
                        if (word && word.length >= 3) { // search if 4 or more chars given
                            // filter view
                            field.className = field.className.replace(' filtering', '') + ' filtering';
                            // expand all gadgets
                            widgetsExpandAll();
                            // filter gadgets
                            var gadgets = document.querySelectorAll('div.gadget, #issuetable');
                            gadgets.forEach(
                                function (widget) {
                                    var rows = widget.querySelectorAll('tbody tr');
                                    rows.forEach(
                                        function (tr) {
                                            if (tr.innerText.toLowerCase().indexOf(word) == -1) {
                                                // invisible the tr
                                                tr.className = tr.className.replace('tr-off', '') + ' tr-off';
                                            } else {
                                                tr.className = tr.className.replace('tr-off', '');
                                            }
                                        }
                                    )
                                    // resize widgets
                                    if (widget.tagName == 'DIV') {  // skip tables
                                        var results = widget.querySelector('div.results-wrap');
                                        var inline = widget.querySelector('.gadget-inline');
                                        if (results) {
                                            if (widget.className.indexOf(' resized') == -1) {
                                                widget.dataset.origHeight = inline.style.height;
                                                widget.clsssName += ' resized';
                                            }
                                            inline.style.height = results.style.height;
                                        }
                                    }
                                }
                            )
                            updateGadgets();

                        } else {
                            // show all rows
                            field.className = field.className.replace(' filtering', '');
                            document.querySelectorAll('.gadget tr.tr-off, #issuetable tr.tr-off').forEach(
                                function (tr) {
                                    tr.className = tr.className.replace('tr-off', '');
                                }
                            )
                            // de-resize widgets
                            updateGadgets();
                            if (0) {
                                var gadgets = document.querySelectorAll('div.gadget.resized');
                                gadgets.forEach(
                                    function (widget) {
                                        // resize widgets
                                        var results = widget.querySelector('div.results-wrap');
                                        var inline = widget.querySelector('.gadget-inline');
                                        if (results) {
                                            inline.style.height = widget.dataset.origHeight;
                                            widget.clsssName = widget.className.replace(' resized', '');
                                        }

                                    }
                                );
                            }

                        }
                    }
                );
                clean.addEventListener('click',
                    function (e) {
                        // clear quick-search-field and disable filtering
                        var field = document.querySelector('#quick-search-field');
                        field.value = '';
                        field.className = field.className.replace(' filtering', '');
                        document.querySelectorAll('.gadget tr.tr-off, #issuetable tr.tr-off').forEach(
                            function (tr) {
                                tr.className = tr.className.replace('tr-off', '');
                            }
                        );
                        updateGadgets();
                    }
                );
            }
        }
    }

    // ===============  functions ==================

    /**
     * mark special projects (i.e. Update Service)
     */
    function markSpecialProjects() {
        if (cfg && cfg.warn_ups) {
            // replace older ups styles
            var styles = document.querySelector('#ups-styles');
            if (styles) {
                styles.parentNode.removeChild(styles);
            }
            // add new ups styles
            var css = '' +
                '.project a.special-prj { color: ' + cfg.color_ups + '!important; } ' +
                '';
            insertCss(css, 'ups-styles');
            // mark service projects with color
            var projects = document.querySelectorAll("td.project a");
            if (projects.length) {
                    for (var idx = 0; idx < projects.length; idx++) {
                        var prj = projects[idx];
                        if (prj.innerText.endsWith('Support Service')) {
                            prj.className = prj.className.replace(' special-prj', '') + ' special-proj';
                        }
                    }
                }
        }
    }

    /**
     * add project name on task view
     *
     */
    function addProjektNameInTaskView() {
        if (cfg && cfg.show_projectname) {
            // add project title to task view
            var proj_title = document.querySelector('.css-6p2euf');
            if (show_full_proj_title && proj_title) {
                var bc = document.querySelector('.aui-nav-breadcrumbs');
                if (bc) {
                    bc.prepend(proj_title.innerText + ' : ')
                }
            }
        }
    }

    /**
     * mark tasks by deadline distance (+ 2, + 1, today, overflowed)
     */
    function markTasksByDeadline() {
        if (cfg && cfg.colored_tasks) {
            // replace older styles
            var styles = document.querySelector('#colored-tasks');
            if (styles) {
                styles.parentNode.removeChild(styles);
            }
            // build new task colors
            var css = '' +
                '.overrun td, .overrun td a { color: ' + cfg.color_over + '!important; } ' +
                '.todo-days-0 td, .todo-days-0 td a { color: ' + cfg.color_day0 + ' !important; } ' +
                '.todo-days-1 td, .todo-days-1 td a { color: ' + cfg.color_day1 + ' !important; } ' +
                '.todo-days-2 td, .todo-days-2 td a { color: ' + cfg.color_day2 + ' !important; } ' +
                '';
            insertCss(css, 'colored-tasks');
            // calc deadline distance
            var days_0 = 24 * (60 * 60 * 1000);
            var days_1 = days_0 * 2;
            var days_2 = days_0 * 3;
            var tmp = new Date().toDateString().split(' ');
            var today = new Date([tmp[2], tmp[1], tmp[3]].join('/'));
            var tasks = document.querySelectorAll('td.duedate');
            tasks.forEach(
                function (td) {
                    var task = td.parentNode.querySelector('td.summary');
                    var status = td.parentNode.querySelector('td.status');
                    if (status) {
                        status = status.innerText.toLowerCase();
                    } else {    // Fallback if td.status doesnt exists
                        status = 'offen';
                    }
                    if (done_stati.indexOf(status) == -1) {     // status not in done_stati
                        var due_date = getStandardDate(td.innerText);
                        var t_diff = new Date(due_date) - today;
                        var elem_css = '';
                        if (t_diff < 0) {
                            elem_css = ' overrun';
                        } else if (t_diff < days_0) {
                            elem_css = ' todo-days-0';  // deadline in 0 days
                        } else if (t_diff >= days_0 && t_diff < days_1) {
                            elem_css = ' todo-days-1'; // deadline in 1 day
                        } else if (t_diff >= days_1 && t_diff < days_2) {
                            elem_css = ' todo-days-2'; // deadline in 2 days
                        }
                        td.closest('tr').className += elem_css;
                    }
                }
            );
        }
    }

    /**
     * looking for link to old issue view and use them
     */
    function useAlwaysOldIssueView() {
        if (cfg && cfg.old_issue_view) {
            // old view-mode link on issue view
            var a = document.querySelector("#jira-frontend-content .gGZyaD a[href*='?oldIssueView=true']");
            if (a) {
                window.clearInterval(watcher1);
                window.stop();
                if (!document.querySelector('#wait-for-loading')) {
                    var div = document.createElement('DIV');
                    div.id = 'wait-for-loading';
                    div.innerHTML = spinner.trim();
                    // document.querySelector('#jira-frontend').append(div);
                    document.querySelector('body').append(div);
                    a.click();
                }
            }
        }
    }

    /**
     * search for link to tasks/issues and add old-view-param
     *
     */
    function modifyIssueLinks() {
        if (cfg && cfg.old_issue_view) {
            var task_links = document.querySelectorAll('a.issue-link');
            if (task_links.length) {
                task_links.forEach(
                    function (a) {
                        if (a.href.indexOf('oldIssueView=true') == -1) {
                            if (a.href.indexOf('?') == -1) {
                                a.href += '?oldIssueView=true';
                            } else {
                                a.href += '&oldIssueView=true';
                            }
                        }
                    }
                )
            }
        }
    }

    // ---  init script ---
    function startScript() {
        loadConfig();
        insertCss(css);
        initSetupDialog();
        watcher1 = window.setInterval(useAlwaysOldIssueView, 100);
        watcher2 = window.setInterval(waitForSidebar, 100);
        modifyIssueLinks();
        markTasksByDeadline();
        markSpecialProjects();
        addProjektNameInTaskView();
    }

    // ---  instant (DOM Ready)   ---

    // ---  window loaded  ---

    /**
     * exec some tasks after the page has loading finished
     */
    function pageLoadFinish() {
        window.setTimeout(startScript, 500);
    }

    window.addEventListener("load", function(event) {
        pageLoadFinish();
    });

})();