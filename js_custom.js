// --- Version ---
var vers = '0.31';

// config
var show_full_proj_title    = 1;
var mark_service_proj	    = 1;
var done_stati              = ['erledigt', 'geschlossen'];


// exec modifications

// add project title to task view
var proj_title = document.querySelector('.css-6p2euf');
if (show_full_proj_title && proj_title) {
    document.querySelector('.aui-nav-breadcrumbs').prepend(proj_title.innerText + ' : ')
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

function addQuickSearch() {
    var search  = document.createElement('INPUT');
    var clean   = document.createElement('SPAN');
    search.id   = 'quick-search-field';
    clean.id    = 'quick-search-clear';
    document.querySelector('body').appendChild(search);
    document.querySelector('body').appendChild(clean);

    search.addEventListener('keyup',
        function (e) {
            var field   = e.target;
            var word    = field.value.toLowerCase();
            if (word && word.length > 3) {
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
                    }
                )
            } else {
                // show all rows
                field.className = field.className.replace(' filtering', '');
                document.querySelectorAll('.gadget tr.tr-off, #issuetable tr.tr-off').forEach(
                    function (tr) {
                        tr.className = tr.className.replace('tr-off', '');
                    }
                )
            }
        }
    );
    console.log('init');
    clean.addEventListener('click',
        function(e) {
            // clear quick-search-field and disable filtering
            var field   = document.querySelector('#quick-search-field');
            field.value = '';
            field.className = field.className.replace(' filtering', '');
            document.querySelectorAll('.gadget tr.tr-off, #issuetable tr.tr-off').forEach(
                function (tr) {
                    tr.className = tr.className.replace('tr-off', '');
                }
            )
        }
    );
}


/* ---  init script --- */

function startScript() {
    markOverrunedTasks();
    addQuickSearch();
}


window.setTimeout(startScript, 2000);
