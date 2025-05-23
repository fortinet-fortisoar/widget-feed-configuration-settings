/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
  'use strict';
  (function () {
      angular
          .module('cybersponse')
          .controller('editFeedConfigurationSettings200Ctrl', editFeedConfigurationSettings200Ctrl);
  
          editFeedConfigurationSettings200Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'appModulesService'];
  
      function editFeedConfigurationSettings200Ctrl($scope, $uibModalInstance, config, appModulesService) {
          $scope.cancel = cancel;
          $scope.save = save;
          $scope.config = config;
  
          function init() {
            appModulesService.load(true).then(function (modules) {
              $scope.modules = modules;
            });
          }
  
          function cancel() {
            $uibModalInstance.dismiss("cancel");
          }
  
          function save() {
            $uibModalInstance.close($scope.config);
          }
  
          init();
  
      }
  })();