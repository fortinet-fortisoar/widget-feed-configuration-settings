/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
  angular
    .module('cybersponse')
    .directive('feedConfigSchedule', feedConfigSchedule);

    feedConfigSchedule.$inject = ['$http', 'API', '$filter', '$window', 'CRUD_HUB', 'TimeZoneServices', 'SchedulesService',
    'localStorageService', 'currentPermissionsService', '_'];

  function feedConfigSchedule($http, API, $filter, $window, CRUD_HUB, TimeZoneServices, SchedulesService,
    localStorageService, currentPermissionsService, _) {
    var directive = {
      restrict: 'A',
      scope: {
        viewWidgetVars: '<',
        jsonData: '='
      },
      controller: 'BaseCtrl',
      templateUrl: 'widgets/installed/feedConfigurationSettings-2.0.0/widgetAssets/html/feedConfigSchedule.html',
      link: link
    };
    function link(scope) {
      scope.save = save;
      scope.datetimeQuick = CRUD_HUB.DATETIME_QUICK;
      scope.picklists = {};
      scope.updateCron = updateCron;
      scope.allowEdit = currentPermissionsService.availablePermission('schedules', 'create') || currentPermissionsService.availablePermission('schedules', 'update');
      scope.dateField = {
        'name': 'dateRange',
        'title': 'Date Range',
        'type': 'datetime.quick',
        'editable': true
      };
      scope.hidePlaybook = false;
      scope.scheduleConfig = {
        name: scope.jsonData.name,
        id: null,
        crontab: {
          minute: '01',
          hour: '0',
          day_of_week: '*',
          day_of_month: '*',
          month_of_year: '*'
        },
        kwargs: {
        }
      };

      scope.params = {
        updating: false,
        isSaveDisabled: false,
        action: 'Add',
        playbookList: null,
        defaultCronexpression: {
          minute: '01',
          hour: '0',
          day_of_week: '*',
          day_of_month: '*',
          month_of_year: '*'
        },
        form: {
          ingestMethod: 'ingestionPlaybook',
          sampleData: null,
          sampleDataParsed: null,
          sampleDataParsedCopy: [],
          scheduleSaving: false,
          fieldMappingSaving: false,
          scheduleFetching: false,
          maxPagination: 10,
          scheduled: 'N',
          toggleField: {},
          togglePicklist: {},
          scheduleRequire: false,
          notificationMode: false,
          appPushMode: false,
          fields: {},
          schedule: {
              name: undefined,
              crontab: {
              minute: '01',
              hour: '0',
              day_of_week: '*',
              day_of_month: '*',
              month_of_year: '*'
              },
              kwargs: {
              exit_if_running: false
              }
          }
        },
        config: {},
        cronexpression: {
          minute: '01',
          hour: '0',
          day_of_week: '*',
          day_of_month: '*',
          month_of_year: '*'
        },
        timezones: {}
      };
      scope.params.config.cron = true;
      scope.processingScheduleData = false;

      scope.$watch('scheduleConfig.kwargs.wf', function (newVal, oldVal) {
        if (newVal && (oldVal && typeof oldVal === 'object')) {
          scope.scheduleForm.$setDirty();
        }
      });

      function updateCron(updatedCronSection) {
        var cronstrue = $window.cronstrue;
        scope.cronDescriber = '';
        if (scope.scheduleConfig.crontab.minute !== '' && scope.scheduleConfig.crontab.hour !== '' && scope.scheduleConfig.crontab.day_of_month !== '' && scope.scheduleConfig.crontab.month_of_year !== '' && scope.scheduleConfig.crontab.day_of_week !== '') {
          scope.cronDescriber = cronstrue.toString(scope.scheduleConfig.crontab.minute + ' ' + scope.scheduleConfig.crontab.hour + ' ' + scope.scheduleConfig.crontab.day_of_month + ' ' + scope.scheduleConfig.crontab.month_of_year + ' ' + scope.scheduleConfig.crontab.day_of_week);
        }
        scope.params.config.cronName = angular.copy(scope.cronDescriber);
        //scope.$emit('feedScheduleDetails', { 'status': true, 'scheduleDetails': scope.scheduleConfig, 'scheduleFrequency': scope.cronDescriber });
        if (!scope.scheduleForm.$dirty && updatedCronSection) {
          scope.scheduleForm.$setDirty();
        }
      }

      function loadScheduleData() {
        $http({
          method: 'GET',
          url: API.WORKFLOW + 'api/scheduled/?format=json&name=' + scope.jsonData.name
        }).then(function (response) {
          scope.params.form.schedule.kwargs.exit_if_running = true;
          scope.params.form.scheduled = 'Y'
          if (response.data['hydra:member'] && response.data['hydra:member'].length > 0) {
            scope.scheduleConfig.id = response.data['hydra:member'][0].id;
            scope.processingScheduleData = true;
            SchedulesService.loadScheduleDetails(scope.scheduleConfig.id).then(function (result) {
              scope.scheduleConfig = result;
              scope.scheduleConfig.kwargs = scope.scheduleConfig.kwargs || {};
              if (scope.scheduleConfig.kwargs.wf_iri) {
                var playbookId = '';
                if (scope.scheduleConfig.kwargs.wf_iri.indexOf(API.WORKFLOWS) > 0) {
                  playbookId = $filter('getEndPathName')(scope.scheduleConfig.kwargs.wf_iri);
                } else {
                  playbookId = scope.scheduleConfig.kwargs.wf_iri;
                }
                scope.scheduleConfig.kwargs.wf = API.API_3_BASE + API.WORKFLOWS + playbookId;
              }
              scope.processingScheduleData = false;
              scope.scheduleConfig.kwargs.start_time = scope.scheduleConfig.kwargs.start_time || scope.scheduleConfig.start_time;
              scope.scheduleConfig.kwargs.expires = scope.scheduleConfig.kwargs.expires || scope.scheduleConfig.expires;
              scope.scheduleConfig.kwargs.timezone = scope.scheduleConfig.kwargs.timezone || scope.scheduleConfig.crontab.timezone;
              updateCron();;
            });
          }
          else {
            scope.params.form.scheduled = 'N'
            scope.params.form.schedule.kwargs.exit_if_running= false;
            updateCron();
          }
        });
      }

      init();
      function init() {
        TimeZoneServices.getTimeZoneList().then(function (timezones) {
          scope.params.timezones = timezones;
          loadScheduleData();
        });
      };

      scope.searchZoneName = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (scope.fieldDropDown) {
          scope.fieldDropDown.isopen = true;
        }
      };

      scope.selectTimezone = function (timezone) {
        timezone = timezone || {};
        scope.scheduleConfig.kwargs.timezone = timezone.utc;
        scope.scheduleConfig.kwargs.utcOffset = timezone.utcOffset;
        scope.setDateAsPerTimezone('expires');
        scope.setDateAsPerTimezone('start_time');
        scope.scheduleForm.$setDirty();
      };

      scope.$watch('scheduleConfig.kwargs.expires', function () {
        scope.setDateAsPerTimezone('expires');
      });
      scope.$watch('scheduleConfig.kwargs.start_time', function () {
        scope.setDateAsPerTimezone('start_time');
      });

      scope.setDateAsPerTimezone = function (dateKey) {
        var ALL_COLONS = /:/g;
        var timezone = scope.scheduleConfig.kwargs.utcOffset;
        var requestedTimezoneOffset = null;
        if (timezone) {
          timezone = timezone.replace(ALL_COLONS, '');
          requestedTimezoneOffset = Date.parse('Jan 01, 1970 00:00:00 ' + timezone) / 60000;
        }
        scope.scheduleConfig[dateKey] = null;
        if (scope.scheduleConfig.kwargs[dateKey]) {
          if (!angular.isDate(scope.scheduleConfig.kwargs[dateKey])) {
            scope.scheduleConfig.kwargs[dateKey] = new Date(scope.scheduleConfig.kwargs[dateKey]);
          }
          var currentTimeZoneOffset = scope.scheduleConfig.kwargs[dateKey].getTimezoneOffset();
          scope.scheduleConfig[dateKey] = angular.copy(scope.scheduleConfig.kwargs[dateKey]);
          if (requestedTimezoneOffset) {
            scope.scheduleConfig[dateKey].setMinutes(scope.scheduleConfig[dateKey].getMinutes() + ((requestedTimezoneOffset - currentTimeZoneOffset)));
          }
        }
      };

      scope.setCronValue = function (field, key) {
        if (scope.params.form.scheduled === 'N') {
          return;
        }
        angular.forEach(scope.scheduleConfig.crontab, function (cronVal, cronKey) {
          if (cronKey === 'minute' || cronKey === 'hour' || cronKey === 'day_of_week' || cronKey === 'day_of_month' || cronKey === 'month_of_year') {
            scope.scheduleConfig.crontab[cronKey] = '*';
          }
        });
        if (key === 'daily') {
          scope.scheduleConfig.crontab.minute = '1';
          scope.scheduleConfig.crontab.hour = '0';
        } else if (key === 'hourly') {
          scope.scheduleConfig.crontab.minute = '0';
          scope.scheduleConfig.crontab.hour = '*/1';
        } else if (key === 'minute') {
          scope.scheduleConfig.crontab.minute = '*/5';
        } else if (key === 'weekly') {
          scope.scheduleConfig.crontab.minute = '1';
          scope.scheduleConfig.crontab.hour = '0';
          scope.scheduleConfig.crontab.day_of_week = '1';
        } else if (key === 'monthly') {
          scope.scheduleConfig.crontab.minute = '1';
          scope.scheduleConfig.crontab.hour = '0';
          scope.scheduleConfig.crontab.day_of_month = '1';
        } else if (key === 'yearly') {
          scope.scheduleConfig.crontab.minute = '1';
          scope.scheduleConfig.crontab.hour = '0';
          scope.scheduleConfig.crontab.day_of_month = '1';
          scope.scheduleConfig.crontab.month_of_year = '1';
        }
        scope.scheduleForm.$setDirty();
        scope.updateCron();
      };

      scope.$watch('scheduleForm.$dirty', function(newVal) {
        if (newVal) {
          // Reset isSaveDisabled when the form is dirty (modified)
          scope.params.isSaveDisabled = false;
        }
      });

      function save(scheduleForm) {
        if (scheduleForm.$invalid) {
          scheduleForm.$setTouched();
          scheduleForm.$focusOnFirstError();
          return;
        }
        scope.params.isSaveDisabled = true;
        scope.params.updating = true;
        scope.scheduleConfig.enabled = true;
        scope.scheduleConfig.kwargs.wf_iri = "/api/3/workflows/"+ scope.jsonData.playbook_uuid;
        var priority_payload = {
          "@id": "/api/3/picklists/2b563c61-ae2c-41c0-a85a-c9709585e3f2",
          "@type": "Picklist",
          "itemValue": "Medium",
          "orderIndex": 1,
          "color": null,
          "icon": null,
          "listName": "/api/3/picklist_names/e104ef72-11b4-4d0c-be0e-e1cf3b87b5f2",
          "uuid": "2b563c61-ae2c-41c0-a85a-c9709585e3f2",
          "id": 111,
          "importedBy": []
        }
        scope.scheduleConfig.kwargs.priority = priority_payload;
        scope.scheduleConfig.crontab.timezone = scope.scheduleConfig.kwargs.timezone;
        scope.scheduleConfig.kwargs.createUser = localStorageService.get(API.API_3_BASE + API.CURRENT_ACTOR)['@id'];
        var scheduleData = angular.copy(scope.scheduleConfig);
        if (scheduleData.kwargs.wf) {
          delete scheduleData.kwargs.wf;
        }
        SchedulesService.saveSchedule(scheduleData).then(function (data) {
          scope.scheduleConfig.id = data.id;
          scope.status = true;
          scope.params.updating = false;
          scope.params.isSaveDisabled = true; 
          scope.$emit('feedScheduleDetails', { 'status': scope.status, 'scheduleDetails': scope.scheduleConfig, 'scheduleFrequency': scope.cronDescriber });
          scope.scheduleForm.$setPristine();
          _isScheduleModified = true;
        }, function (error) {
          // In case of error, also enable the save button again
          scope.params.isSaveDisabled = false;
        }
        );
      }
    }
    return directive;
  }
})();