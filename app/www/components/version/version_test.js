'use strict';

describe('LTBApp.version module', function() {
  beforeEach(module('LTBApp.version'));

  describe('version service', function() {
    it('should return current version', inject(function(version) {
      expect(version).toEqual('0.1');
    }));
  });
});
