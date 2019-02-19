# jira-custom-modification
Custom Javascript to add some features to the JIRA browser app.

# Features
**Dashboard**
- add collapse/expand quick-actions
- add quick-search field to filter gadget content
- mark tasks by deadline

**Filters view**
- add quick-search field to filter task list
 
**Task view**
- if the link "use old issue view" is available, then autom. use it

-----

# Requirements
You have to install a browser addon to add custom script to any website.

I recommend Tampermonkey:
* [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
* [Tampermonkey for Opera](https://addons.opera.com/de/extensions/details/tampermonkey-beta/)
* [Tampermonkey for Firefox](https://addons.mozilla.org/de/firefox/addon/tampermonkey/)

# Get started
In this tutorial I use "TM" as shortcut for the word "Tampermonkey".

1. **Install the addon** 
Click on the link above and install TM to your favorit browser. After that you see the TM-Icon right top.

2. **Add a new script** 
Right-click on that new icon in your browser and click on "Create a new script".
![pic1](https://c1.staticflickr.com/8/7844/46390822204_603ee56e06.jpg)

3. **Copy source code** 
All the script logic is placed in one single file. Your find it here in this repository.
You have to copy the source code by use the Edit - button and put it into the new created script inside TM.

4. **Save and test it** 
Save the copied code inside TM with the shortcut CTRL+S or via TM-menu "File - Save to disk".
Now call the DIM website to see if it works.

[Call the JIRA App webpage to test](https://positivmultimedia.atlassian.net/secure/Dashboard.jspa)

# Final
Now, after any reload of DIM page, the script will be execute automatically.

