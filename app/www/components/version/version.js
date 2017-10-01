'use strict';

angular.module('LTBApp.version', [
  'LTBApp.version.interpolate-filter',
  'LTBApp.version.version-directive'
])

.value('version', '0.1');
