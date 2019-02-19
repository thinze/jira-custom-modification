// ==UserScript==
// @name         jira-custom-modification
// @namespace    http://tampermonkey.net/
// @version      0.36.1
// @description  add some additional features for JIRA
// @author       T. Hinze
// @match        https://positivmultimedia.atlassian.net/*
// @grant        none
// @update       https://gitlab.com/positivmultimedia/jira-custom-modification/raw/master/js_custom.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Version ---
    var js_debug                = 1;
    var watcher1                = null;

    // config
    var show_full_proj_title    = 1;
    var mark_service_proj	    = 1;
    var done_stati              = ['erledigt', 'geschlossen'];

    var action_css = '' +
        '#my-jira-actions { position:fixed; background:rgba(0, 0, 0, 0.65); padding:5px; z-index:99999; top:300px; left:160px; ' +
        '  transform:translate(-50%, 0); }' +
        '#my-jira-actions h6 { color: #ccc; margin: -5px 0 5px; padding: 0; } ' +
        '#my-jira-actions .row {}' +
        '#my-jira-actions .row button { font-size:90%; margin:1px; }' +
        '#my-jira-actions .row button:hover { background:green; color:#fff; }' +
        '#my-jira-actions .row button:active { background:black; }' +
        ' ';

    var css = action_css +
    '#issuetype-single-select, div#project-single-select { max-width: none; width: 600px; } ' +
    '#issuetype-single-select > input, div#project-single-select > input { max-width: none; } ' +
    '#content #project_container .aui-ss-field#project-field { max-width: none !important; width: 600px; background: red; } ' +
    '.overrun td, .overrun td a { color: red !important; } ' +
    '.todo-days-1 td, .todo-days-1 td a { color: orange !important; } ' +
    '.todo-days-2 td, .todo-days-2 td a { color: mediumaquamarine !important; } ' +
    '#quick-search-field { display: inline-block; position: fixed; z-index: 99999; top: 365px; left: 160px; transform: translateX(-50%); ' +
    '        width: 290px; max-width: 50%; background: #eee; padding: 2px; } ' +
    '#quick-search-field.filtering { background: lightgreen; } ' +
    '#quick-search-clear { display: inline-block; position: fixed; width: 290px; max-width: 50%; top: 365px; left: 160px; transform: translateX(-50%); ' +
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

    // ===============  functions ==================

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

    function markOverrunedTasks() {
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

    function addQuickSearch() {
        var body    = document.querySelector('#page-body');
        var search  = document.createElement('INPUT');
        var clean   = document.createElement('SPAN');
        search.id   = 'quick-search-field';
        clean.id    = 'quick-search-clear';
        if (body) {
            body.appendChild(search);
            body.appendChild(clean);

            search.addEventListener('keyup',
                function (e) {
                    var field = e.target;
                    var word = field.value.toLowerCase();
                    if (word && word.length > 3) { // search if 4 or more chars given
                        // filter view
                        field.className = field.className.replace(' filtering', '') + ' filtering';
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
            console.log('init');
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

    function addDashboardFoldActions() {
        var dashboard = document.querySelector('#dashboard-content');
        if (dashboard) {
            // create actions
            var html = '' +
                '<h6>Actions</h6>' +
                '<div class="row">' +
                '<button id="widgets-collapse" data-callback="widgetsCollapseAll" class="action">collapse</button><button id="widgets-expand" data-callback="widgetsExpandAll" class="action">expand</button>' +
                '</div>';
            var div         = document.createElement('DIV');
            div.id          = 'my-jira-actions';
            div.innerHTML   = html.trim();
            document.querySelector('#page-body').appendChild(div);
            // bind actions
            document.querySelector('#my-jira-actions #widgets-collapse').addEventListener('click', widgetsCollapseAll);
            document.querySelector('#my-jira-actions #widgets-expand').addEventListener('click', widgetsExpandAll);
        }
    }

    function widgetsCollapseAll() {
        var widgets = document.querySelectorAll('.dashboard-item-content');
        widgets.forEach(function(item, idx) {
            if (item.className.indexOf(' minimization') == -1) {
                item.className = item.className + ' minimization';
                item.previousSibling.querySelector('.dashboard-item-title').dispatchEvent(new Event('dblclick'));
            }
        });
    }

    function widgetsExpandAll() {
        var widgets = document.querySelectorAll('.dashboard-item-content.minimization');
        widgets.forEach(function(item, idx) {
            item.className = item.className.replace(' minimization', '');
            item.previousSibling.querySelector('.dashboard-item-title').dispatchEvent(new Event('dblclick'));
        });
        window.resize();
    }

    /**
     * exec some tasks after the page has loading finished
     */
    function pageLoadFinish() {
        window.clearInterval(watcher1); // remove watcher for old-issue-view-link
    }

    // ---  init script ---
    function startScript() {
        insertCss(css);
        addDashboardFoldActions();
        addQuickSearch();
        markOverrunedTasks();
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