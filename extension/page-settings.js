<!DOCTYPE html>
<!--
 * Copyright (c) 2010 The Chromium Authors. All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
-->
<html>
<head>
    <style>
        body {
            width: 100%;
            font: 13px Arial;
        }
    </style>
    <script src="page-settings.js"></script>
    <script type="text/javascript">
        function render() {
          let history_log = chrome.extension.getBackgroundPage().history_log;
          alert('hmm');
          alert(history_log[0]);
        }
    </script>


</head>
<body onload="render()">
  <h1>yyy</h1>
</body>
</html>
