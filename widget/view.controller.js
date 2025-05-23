/* Copyright start
MIT License
Copyright (c) 2024 Fortinet Inc
Copyright end */
'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('feedConfigurationSettings200Ctrl', feedConfigurationSettings200Ctrl);

  feedConfigurationSettings200Ctrl.$inject = [
    '$scope', '$resource', 'API', 'statusCodeService', 'toaster',
    'PagedCollection', 'Query', 'Field', 'ALL_RECORDS_SIZE', '$rootScope', 'CommonUtils'
  ];

  function feedConfigurationSettings200Ctrl($scope, $resource, API,
    statusCodeService, toaster, PagedCollection, Query, Field, ALL_RECORDS_SIZE, $rootScope, CommonUtils) {

    $scope.toggleFeedToIndicatorLinking = { open: true };
    $scope.toggleBlockHighConfidenceThreatFeeds = { open: false };
    $scope.toggleUnstructuredFeedsSupport = { open: false };
    $scope.toggleFeedRules = toggleFeedRules;
    $scope.updatesendNotification = updatesendNotification;
    $scope.save = save;
    $scope.saveSchedules = {};
    $scope.getKeyStoreRecord = false;

    function init() {
      var pagedCollection = new PagedCollection('keys');
      var query = {
        logic: 'AND',
        limit: 1,
        filters: [{
          field: 'key',
          operator: 'eq',
          value: 'threat-intel-management-configuration'
        }],
        __selectFields: ["jSONValue"]
      };

      pagedCollection.query = new Query(query);

      pagedCollection.load().then(function () {
        if (pagedCollection.data['hydra:member'].length > 0) {
          $scope.feedRules = pagedCollection.data['hydra:member'][0].jSONValue;
          $scope.keyStoreRecordUUID = pagedCollection.data['hydra:member'][0].uuid;
          $scope.selectedEmailClient = $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.selectedEmailClient.find(function (client) {
            return client.enabled;
          });
          getEmailClientDetails($scope.selectedEmailClient.name);
          $rootScope.oldFeedToIndicatorLinking = angular.copy($scope.feedRules.feedToIndicatorLinking);
          $rootScope.oldBlockHighConfidenceThreatFeeds = angular.copy($scope.feedRules.blockHighConfidenceThreatFeeds);
          $rootScope.oldUnstructuredFeedsSupport = angular.copy($scope.feedRules.unstructuredFeedsSupport);
          if ($scope.feedRules.unstructuredFeedsSupport.enabled && $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.enabled) {
            var emailIngestionScheduleCrontab = {
              "minute": "0",
              "hour": "*/1",
              "day_of_week": "*",
              "day_of_month": "*",
              "month_of_year": "*"
            };
            _createSchedule('emailIngestionSchedule', $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule, emailIngestionScheduleCrontab);
          }
          if ($scope.feedRules.blockHighConfidenceThreatFeeds.enabled && $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.enabled) {
            var threatFeedBlockScheduleCrontab = {
              "minute": "1",
              "hour": "0",
              "day_of_week": "*",
              "day_of_month": "*",
              "month_of_year": "*"
            };
            _createSchedule('threatFeedBlockSchedule', $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule, threatFeedBlockScheduleCrontab);
          }
          $scope.tagsField = new Field({
            'name': 'Tags',
            'writeable': true,
            'title': 'Tags',
            'formType': 'tags',
            'dataSource': {
              'model': 'recordTags'
            }
          });
          _getFeedRulesSettings().then(function () {
            $scope.getKeyStoreRecord = true; // Set after all API calls are done
          });
        }
      });
    }

    $scope.$on('feedScheduleDetails', function (event, data) {
      var scheduleDetails = {
        id: data.scheduleDetails.id,
        name: data.scheduleDetails.name,
        task: data.scheduleDetails.task,
        crontab: data.scheduleDetails.crontab,
        enabled: data.scheduleDetails.enabled,
        interval: data.scheduleDetails.interval
      };
      if (!CommonUtils.isUndefined($scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams) && $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams.name === data.scheduleDetails.name) {
        $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams = angular.copy(scheduleDetails);
      } else if (!CommonUtils.isUndefined($scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams) && $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams.name === data.scheduleDetails.name) {
        $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams = angular.copy(scheduleDetails);
      }
    });

    $scope.onEmailClientChange = function (selectedEmailClient) {
      getEmailClientDetails(selectedEmailClient.name);
      $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.selectedEmailClient.forEach(function (emailClient) {
        emailClient.enabled = (emailClient.name === selectedEmailClient.name);
      });
    };

    function toggleFeedRules(feedRule, $event) {
      if ($event && $event.target.className === 'switch-slider') {
        feedRule.enabled = !feedRule.enabled;
      }
    }

    function updatesendNotification() {
      if (!$scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromFile.enabled && !$scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.enabled) {
        $scope.feedRules.unstructuredFeedsSupport.sendEmailNotifications.enabled = false;
      }
    }

    function getEmailClientDetails(name) {
      var queryBody = {
        "sort": [
          { "field": "featured", "direction": "DESC" },
          { "field": "label", "direction": "ASC" }
        ],
        "limit": ALL_RECORDS_SIZE,
        "logic": "AND",
        "filters": [
          { "field": "type", "operator": "in", "value": ["connector"] },
          { "field": "name", "operator": "eq", "value": name },
          { "field": "version", "operator": "notlike", "value": "%_dev" }
        ],
        "page": 1,
        "__selectFields": []
      };

      $resource(API.QUERY + 'solutionpacks?$limit=' + ALL_RECORDS_SIZE + '&$page=1').save(queryBody).$promise.then(function (response) {
        if (response['hydra:member'] && response['hydra:member'].length > 0) {
          $scope.exchangeUUID = response['hydra:member'][0].uuid;
        }
      });
    }

    function _createSchedule(scheduleName, scheduleDetails, crontab) {
      var queryBody = {
        name: scheduleDetails.name,
        "crontab": crontab,
        "kwargs": {
          "exit_if_running": true,
          "wf_iri": API.API_3_BASE + API.WORKFLOWS + scheduleDetails.playbook_uuid,
          "timezone": "UTC",
          "utcOffset": "UTC",
          "createUser": "/api/3/people/3451141c-bac6-467c-8d72-85e0fab569ce"
        },
        "enabled": false
      };
      var url = API.WORKFLOW + 'api/scheduled/?depth=2&format=json&limit=' + ALL_RECORDS_SIZE + '&ordering=-modified&search=' + scheduleDetails.name.replace(/\s+/g, '+') + '&task=workflow.tasks.periodic_task';
      // Make the GET request to check if the schedule already exists
      $resource(url).get({}).$promise.then(function (response) {
        if (response['hydra:member'].length === 0) {
          // If no schedule exists, create a new one
          $resource(API.WORKFLOW + 'api/scheduled/?format').save(queryBody).$promise.then(function (postResponse) {
            // Save the new schedule details
            $scope.saveSchedules[scheduleName] = {
              id: postResponse.id,
              crontab: postResponse.crontab,
              interval: postResponse.interval,
              name: postResponse.name,
              task: postResponse.task,
              enabled: postResponse.enabled
            };
            // Update the schedule in feed configuration
            _updateScheduleInFeedConfiguration(scheduleName);
            // If the schedule is not enabled, activate it
            if (!$scope.saveSchedules[scheduleName].enabled) {
              $scope.saveSchedules[scheduleName].enabled = true;
              _updateSchedule($scope.saveSchedules[scheduleName]);
            }
          });
        } else {
          // If schedule exists, use the existing one
          $scope.saveSchedules[scheduleName] = {
            id: response['hydra:member'][0].id,
            crontab: response['hydra:member'][0].crontab,
            interval: response['hydra:member'][0].interval,
            name: response['hydra:member'][0].name,
            task: response['hydra:member'][0].task,
            enabled: response['hydra:member'][0].enabled
          };
          // Update the schedule in feed configuration
          _updateScheduleInFeedConfiguration(scheduleName);
          // If the schedule is not enabled, activate it
          if (!$scope.saveSchedules[scheduleName].enabled) {
            $scope.saveSchedules[scheduleName].enabled = true;
            _updateSchedule($scope.saveSchedules[scheduleName]);
          }
        }
      });
    }

    function _updateScheduleInFeedConfiguration(scheduleName) {
      if (scheduleName === 'emailIngestionSchedule') {
        // Update feed configuration for email ingestion schedule
        $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams = $scope.saveSchedules[scheduleName];
        _updateFeedConfigurationSettings(); // Assuming this function handles the API call and returns a promise
      } else if (scheduleName === 'threatFeedBlockSchedule') {
        // Update feed configuration for threat feed block schedule
        $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams = $scope.saveSchedules[scheduleName];
        _updateFeedConfigurationSettings(); // Assuming this function handles the API call and returns a promise
      }
    }


    function _getFeedRulesSettings() {
      return $resource(API.WORKFLOW + "api/dynamic-variable/?name=Indicator_Feed_Reputation_Preference&format=json").get({}).$promise.then(function (response) {
        $scope.feedConfidenceThresholdVariable = response["hydra:member"][0];
        var parsedFeedConfigValues = JSON.parse($scope.feedConfidenceThresholdVariable.value);
        $scope.feedRules.feedToIndicatorLinking.feedConfidenceThreshold = parsedFeedConfigValues.confidenceThreshold;
        $scope.feedRules.feedToIndicatorLinking.enabled =
          parsedFeedConfigValues.setReputation;
      }, statusCodeService);
    }

    function _updateSchedule(scheduleDetails) {
      var url = API.WORKFLOW + 'api/scheduled/' + scheduleDetails.id + '/?format=json';
      return $resource(url, null, { update: { method: "PUT" } })
        .update(scheduleDetails)
        .$promise
        .then(function () {
          console.log("Schedule updated successfully.");
        }, function () {
          toaster.error({
            body: "Unable to update schedule.",
          });
        });
    }

    function _saveFeedToIndicatorLinking(feedToIndicatorLinkingForm) {
      $scope.feedConfidenceThresholdVariable.value = JSON.stringify({
        setReputation: $scope.feedRules.feedToIndicatorLinking.enabled,
        confidenceThreshold: $scope.feedRules.feedToIndicatorLinking.feedConfidenceThreshold,
      });
      return $resource(API.WORKFLOW + "api/dynamic-variable/" + $scope.feedConfidenceThresholdVariable.id + "/?format=json", null, {
        update: {
          method: "PUT",
        },
      })
        .update($scope.feedConfidenceThresholdVariable)
        .$promise
        .then(function () {
          $scope.feedToIndicatorLinkingForm.$setPristine();
          toaster.success({
            body: "Feed Confidence Threshold updated successfully.",
          });
        }, function () {
          toaster.error({
            body: "Unable to update Feed Confidence Threshold.",
          });
        })
        .finally(function () {
          feedToIndicatorLinkingForm.$dirty = false;
          $rootScope.oldFeedToIndicatorLinking = $scope.feedRules.feedToIndicatorLinking;
        });
    }

    function save(feedConfigurationSettingsForm) {
      var promises = [];
      if (!_.isEqual($rootScope.oldFeedToIndicatorLinking, $scope.feedRules.feedToIndicatorLinking)) {
        feedConfigurationSettingsForm.feedToIndicatorLinkingForm.$setPristine();
        feedConfigurationSettingsForm.feedToIndicatorLinkingForm.$dirty = false;
        promises.push(_saveFeedToIndicatorLinking(feedConfigurationSettingsForm.feedToIndicatorLinkingForm)); // Assuming this returns a promise
      }

      if (!_.isEqual($rootScope.oldBlockHighConfidenceThreatFeeds, $scope.feedRules.blockHighConfidenceThreatFeeds)) {
        feedConfigurationSettingsForm.blockHighConfidenceThreatFeedsForm.$setPristine();
        feedConfigurationSettingsForm.blockHighConfidenceThreatFeedsForm.$dirty = false;

        if (!$scope.feedRules.blockHighConfidenceThreatFeeds.enabled || !$scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.enabled) {
          if ($scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams.enabled !== false) {
            $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams.enabled = false;
            promises.push(_updateSchedule($scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams));
          }
        } else {
          if ($scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams.enabled !== true) {
            $scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams.enabled = true;
            promises.push(_updateSchedule($scope.feedRules.blockHighConfidenceThreatFeeds.automaticBlockIOCEnabled.threatFeedBlockSchedule.avtivateScheduleQueryParams));
          }
        }
      }

      if (!_.isEqual($rootScope.oldUnstructuredFeedsSupport, $scope.feedRules.unstructuredFeedsSupport)) {
        feedConfigurationSettingsForm.unstructuredFeedsSupportForm.$setPristine();
        feedConfigurationSettingsForm.unstructuredFeedsSupportForm.$dirty = false;
        if (!$scope.feedRules.unstructuredFeedsSupport.enabled || !$scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.enabled) {
          if ($scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams.enabled !== false) {
            $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams.enabled = false;
            promises.push(_updateSchedule($scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams));
          }
        } else {
          if ($scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams.enabled !== true) {
            $scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams.enabled = true;
            promises.push(_updateSchedule($scope.feedRules.unstructuredFeedsSupport.ingestFeedsFromEmail.emailIngestionSchedule.avtivateScheduleQueryParams));
          }
        }
      }
      Promise.all(promises)
        .then(function () {
          return _updateFeedConfigurationSettings();
        })
        .then(function () {
          toaster.success({
            body: "Feed configuration settings updated successfully."
          });
        })
        .catch(function () {
          toaster.error({
            body: "Unable to update feed configuration settings."
          });
        });
    }

    function _updateFeedConfigurationSettings() {
      var requestPayload = { jSONValue: $scope.feedRules };
      return $resource(API.BASE + "keys/" + $scope.keyStoreRecordUUID, null, { update: { method: "PUT" } })
        .update(requestPayload)
        .$promise;
    }
    init();
  }
})();
