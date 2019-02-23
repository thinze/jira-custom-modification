// ==UserScript==
// @name         jira-custom-modification
// @namespace    http://tampermonkey.net/
// @version      0.37.2
// @description  add some additional features for JIRA
// @author       T. Hinze
// @match        https://positivmultimedia.atlassian.net/*
// @grant        none
// @update       https://gitlab.com/positivmultimedia/jira-custom-modification/raw/master/js_custom.js
// ==/UserScript==

(function() {
    'use strict';

    // --- settings ---
    var js_debug                = 1;
    var cfg, watcher1, watcher2;

    // config
    var show_full_proj_title    = 1;
    var mark_service_proj	    = 1;
    var done_stati              = ['erledigt', 'geschlossen'];

    var basic_setup             = {
        color_day2  : '',
        color_day1  : '',
        color_day0  : '',
        color_over  : ''
    };

    // --- observer ---
    var sidebar_ro =  new ResizeObserver( entries => {
        for (let entry of entries) {
            var cr = entry.contentRect;
            updateQuickActions(entry.target);
        }
    });

    // --- stylesheets ---

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

    var css = action_css +
    '#issuetype-single-select, div#project-single-select { max-width: none; width: 600px; } ' +
    '#issuetype-single-select > input, div#project-single-select > input { max-width: none; } ' +
    '#content #project_container .aui-ss-field#project-field { max-width: none !important; width: 600px; background: red; } ' +
    '.overrun td, .overrun td a { color: red !important; } ' +
    '.todo-days-1 td, .todo-days-1 td a { color: orange !important; } ' +
    '.todo-days-2 td, .todo-days-2 td a { color: darkturquoise !important; } ' +
    '#quick-search-field { display: inline-block; position: fixed; z-index: 99999; top: 65px; left: 64px; /* transform:translateX(-50%); */ ' +
    '        width: 235px; max-width: none; background: #eee; padding: 2px; } ' +
    '#quick-search-field.filtering { background: lightgreen; } ' +
    '#quick-search-clear { display: inline-block; position: fixed; width: 235px; max-width: none; top: 65px; left: 64px; /* transform: translateX(-50%); */ ' +
    '        height: 1em; background: darkred; margin-left: 1em; z-index: 99998; padding: 3px; } ' +
    '#quick-search-clear:hover { cursor: pointer; } ' +
    '#issuetable tr.tr-off, .gadget tr.tr-off { display: none !important; } ' +
    '#wait-for-loading { position: absolute; z-index: 99999; width: 250px; height: auto; top: 30%; left: 50%; transform: translate(-50%, -50%); filter: blur(0); opacity: 0.8; }' +
    '';


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
     * insert custom CSS
     *
     */
    function insertCss(css) {
        var style   = document.createElement('STYLE');
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
     * save config to loacal storage
     *
     * @param cfg
     * @returns {boolean}
     */
    function saveConfig(data) {
        var success = false;
        if (typeof data == 'object') {
            localStorage['my-jira-cfg'] = data;
            success = true;
        }
        return success;
    }

    /**
     * load config from local storage
     */
    function loadConfig() {
        var data    = localStorage['my-jira-cfg'];
        if (typeof data == 'object') {
            // do something

        } else {
            // use default config
            data = basic_setup;
        }
        cfg = data;
    }

    // ===============  functions ==================

    function initSetupDialog() {

    }

    /**
     * mark special projects (i.e. Update Service)
     */
    function markSpecialProjects() {
        // add project title to task view
        var proj_title = document.querySelector('.css-6p2euf');
        if (show_full_proj_title && proj_title) {
            var bc = document.querySelector('.aui-nav-breadcrumbs');
            if (bc) {
                bc.prepend(proj_title.innerText + ' : ')
            }
        }

        // mark service projects with color
        if (mark_service_proj) {
            var projects = document.querySelectorAll("td.project a");
            if (projects.length) {
                for (var idx=0; idx<projects.length; idx++) {
                    var prj = projects[idx];
                    if (prj.innerText.endsWith('Support Service')) {
                        prj.style.color = '#f00 !important';
                    }
                }
            }
        }
    }

    /**
     * mark tasks by deadline distance (+ 2, + 1, today, overflowed)
     */
    function markTasksByDeadline() {
        var days_1      = 24 * (60 * 60 * 1000);
        var days_2      = days_1 * 2;
        var days_3      = days_1 * 3;
        var tmp         = new Date().toDateString().split(' ');
        var today       = new Date([tmp[2], tmp[1], tmp[3]].join('/'));
        var tasks       = document.querySelectorAll('td.duedate');
        tasks.forEach(
            function (td) {
                var status = td.parentNode.querySelector('td.status');
                if (status) {
                    status = status.innerText.toLowerCase();
                } else {    // Fallback if td.status doesnt exists
                    status = 'offen';
                }
                if (done_stati.indexOf(status) == -1) {     // status not in done_stati
                    var t_diff  = new Date(td.innerText.trim()) - today;
                    var css     = '';
                    if (t_diff < days_1) {
                        // überlaufen
                        css = ' overrun';

                    } else if (t_diff >= days_1 && t_diff < days_2) {
                        css = ' todo-days-1';
                    } else if (t_diff >= days_2 && t_diff < days_3 ) {
                        css = ' todo-days-2';
                    }
                    td.closest('tr').className += css;
                }
            }
        );
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
     * looking for link to old issue view and use them
     */
    function useAlwaysOldIssueView() {
        var a = document.querySelector("a[href*='?oldIssueView=true']");
        if (a) {
            window.clearInterval(watcher1);
            window.stop();
            if (!document.querySelector('#wait-for-loading')) {
                var blur = document.createElement('IMG');
                blur.src = 'https://meinesachsenzeit.de/szapp/images/loading.gif';
                blur.id = 'wait-for-loading';
                document.querySelector('#jira-frontend').append(blur);
                a.click();
            }
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
    function updateQuickActions(elem) {
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
            hideQuickActions();
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
        var dashboard = document.querySelector('#dashboard-content');
        if (dashboard) {
            // create actions
            var html = '' +
                '<h6>Actions</h6>' +
                '<div class="row">' +
                '<button id="widgets-collapse" data-callback="widgetsCollapseAll" class="action">collapse</button><button id="widgets-expand" data-callback="widgetsExpandAll" class="action">expand</button>' +
                '</div>';
            var div         = document.createElement('DIV');
            div.id          = 'my-jira-dashboard-actions';
            div.innerHTML   = html.trim();
            // add new actions to the document
            document.querySelector('#my-jira-quick-actions').appendChild(div);
            // bind actions
            document.querySelector('#my-jira-dashboard-actions #widgets-collapse').addEventListener('click', widgetsCollapseAll);
            document.querySelector('#my-jira-dashboard-actions #widgets-expand').addEventListener('click', widgetsExpandAll);
        }
    }

    /**
     * add quick search field to instant-filtering
     */
    function addQuickSearch() {
        var quick_actions   = document.querySelector('#my-jira-quick-actions');
        var dashboard       = document.querySelector('#dashboard-content');
        var navigator       = document.querySelector('#content .navigator-body');
        if (quick_actions && (dashboard || navigator)) {
            var search = document.createElement('INPUT');
            var clean  = document.createElement('SPAN');
            search.id  = 'quick-search-field';
            clean.id   = 'quick-search-clear';
            quick_actions.appendChild(search);
            quick_actions.appendChild(clean);
            updateQuickActions();

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
     * exec some tasks after the page has loading finished
     */
    function pageLoadFinish() {
        window.clearInterval(watcher1); // remove watcher for old-issue-view-link
    }

    // ---  init script ---
    function startScript() {
        loadConfig();
        insertCss(css);
        initSetupDialog();
        watcher2 = window.setInterval(waitForSidebar, 100);
        markTasksByDeadline();
        markSpecialProjects();
    }

    // ---  instant (DOM Ready)   ---
    window.setTimeout(startScript, 1000);
    watcher1 = window.setInterval(useAlwaysOldIssueView, 100);

    // ---  window loaded  ---
    window.addEventListener("load", function(event) {
        pageLoadFinish();
    });

})();