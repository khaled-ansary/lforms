'use strict';

angular.module('lformsWidget')
  .controller('PanelSearchCtrl', function ($scope, $http, selectedFormData) {
    $scope.selectedPanel = [null,null,null, null];
    $scope.pIndex = 0;

    $scope.panelList = [
      {text: 'USSG-FHT, (new data structure)', id: '54127-6NEW'},
      {text: 'Glasgow Coma Score (new data structure)', id: '35088-4B'},
      {text: 'MDS3, (new data structure)', id: '54580-6NEW'},
      {text: 'USSG-FHT, (with mock-up items for skip logic demo)', id: '54127-6N'},
      {text: 'USSG-FHT, (with mock-up items for horizontal layout demo)', id: '54127-6H'},
      {text: 'Glasgow Coma Score (with score rules)--RI', id: '35088-4'},
      {text: 'Full-Featured Demo', id: 'all-in-one'},
      {text: 'Form Builder created test form', id: 'formC'}
    ];

    // base config for ui-select2
    $scope.tagOptions = {
      width: "100%",
      maximumSelectionSize:1,
      minimumInputLength: 0,
      minimumResultsForSearch: -1,
      allowClear: false,
      selectOnBlur: false,
      multiple: false
    };

    $scope.panelListOpt = function() {
      var answerList = $scope.panelList

      return jQuery.extend({}, $scope.tagOptions, {
        data:answerList,
        placeholder: "Select from the list"
      });
    };

    $scope.addMoreWidget = function(tabIndex) {

      // get the widget data
      // some selected panels
      if($scope.selectedPanel[tabIndex]) {
        var loinc_num = $scope.selectedPanel[tabIndex].id;
      }
      if (loinc_num) {
        if (loinc_num == '54127-6NEW') {
          selectedFormData.updateForm(new LFormsData(angular.copy(FHTDataNew)));
        }
        else if (loinc_num == '54580-6NEW') {
          selectedFormData.updateForm(new LFormsData(angular.copy(MDS3)));
        }
        else if (loinc_num == '54127-6N') {
          selectedFormData.updateForm(new WidgetData(angular.copy(FHTData)));
        }
        else if (loinc_num == '54127-6H') {
          selectedFormData.updateForm(new WidgetData(angular.copy(horizontalFHTData)));
        }
        else if (loinc_num == '35088-4') {
          selectedFormData.updateForm(new WidgetData(WidgetUtil.convertFromEmbeddedToReference(angular.copy(glasgowRI))));
        }
        else if (loinc_num == '35088-4B') {
          selectedFormData.updateForm(new LFormsData(angular.copy(glasgow)));
        }
        else if (loinc_num == 'all-in-one') {
          selectedFormData.updateForm(new WidgetData(angular.copy(allInOne)));
        }
        else if (loinc_num == 'formC') {
          selectedFormData.updateForm(new WidgetData(WidgetUtil.convertFromEmbeddedToReference(angular.copy(formBuilder))));
        }
      }
    };

  });
