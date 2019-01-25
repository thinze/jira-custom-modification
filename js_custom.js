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
            var status = td.parentNode.querySelector('td.status').innerText.toLowerCase();
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
window.setTimeout(markOverrunedTasks, 2000);
