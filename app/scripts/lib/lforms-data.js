/**
 * Form definition data processing
 */
var LFormsData = Class.extend({
  // form type. for now the only type is "LOINC"
  type: null,
  // form's code
  code: null,
  // form's name
  name: null,

  // a pre-defined view template used to display the form
  template: null,
  // additional options that controls the selected view template
  templateOption: {},

  // the question items defined in a form
  items : [],

  // a delimiter used in code path and id path
  PATH_DELIMITER : "/",

  // formulas used by questions, by merging all the formula directly embedded in items
  // embedded formula format:
  //    {name:, value:}
  // a "target" key is added to the formula format in the _formulas array:
  //    {name:, value:, target:}
  // for now, there's only two formulas: TOTALSCORE, BMI
  _formulas: [],

  // if there's a TOTALSCORE formula
  _hasScoreRule: null,

  // repeatable question items derived from items
  _repeatableItems : {},

  // angular built-in validation tokens, not used yet
  _validationTokens: [
    "ng-maxlength",
    "ng-minlength",
    "pattern",
    "required",
    "number", // for INPUT element only
    "max",  // for number only
    "min",  // for number only
    "email",  // for INPUT element only
    "url",    // for INPUT element only
  ],

  // supported keys in restriction, not used yet
  _restrictionKeys : [
    "minExclusive",
    "minInclusive",
    "maxExclusive",
    "maxInclusive",
    "totalDigits",
    "fractionDigits",
    "length",
    "minLength",
    "maxLength",
    "enumeration",
    "whiteSpace",
    "pattern"
  ],

  // supported data type
  _dataTypes : [
    "BL",
    "INT",
    "REAL",
    "ST",
    "BIN",
    "DT",      // complex type (or sub-type of 'ST' ?)
    "DTM",     // complex type (or sub-type of 'ST' ?)
    "TM",      // complex type (or sub-type of 'ST' ?)
    "CNE",     // complex type
    "CWE",     // complex type
    "RTO",     // complex type
    "QTY",     // complex type
    "YEAR",    // sub-type of "ST"
    "MONTH",   // sub-type of "ST"
    "DAY",     // sub-type of "ST"
    "URL",     // sub-type of "ST"
    "EMAIL",   // sub-type of "ST"
    "PHONE",   // sub-type of "ST"
    "",        // for header, no input field
  ],

  // All accessory attributes of an item
  // (move all other properties into this _opt eventually.)
  _opt: {},

  /**
   * Constructor
   * @param data the lforms form definition data
   */
  init: function(data) {

    var start = new Date().getTime();

    this.items = data.items;
    this.code = data.code;
    this.name = data.name;
    this.type = data.type;
    this.hasUserData = data.hasUserData;
    this.template = data.template;
    this.templateOption = data.templateOption || {};
    this.PATH_DELIMITER = data.PATH_DELIMITER || "/";
    this.answerLists = data.answerLists;

    // when the skip logic rule says the form is done
    this._formDone = false;

    // update internal data (_id, _idPath, _codePath, _displayLevel_, _parentIdPath_, and _parentCodePath_),
    // that are used for widget control and/or for performance improvement.
    this._initializeInternalData_NEW();

    var time = 'LFormsData is initialized in ' +(new Date().getTime() - start)/1000 +
        ' seconds';
    console.log(time);
  },


  /**
   * Calculate internal data from the raw form definition data,
   * including:
   * structural data, (TBD: unless they are already included (when hasUserData == true) ):
   *    _id, _idPath, _codePath
   * data for widget control and/or performance improvement:
   *    _displayLevel_, _parentIdPath_, and _parentCodePath_
   * @private
   */
  _initializeInternalData_NEW: function() {
    // set default values
    this._setDefaultValues();


    //TODO, process form data that includes user data

    //TODO, validate form data

    // set values for _id, _idPath, _codePath based on the questionCode and parentQuestionCode
    // also set values for _displayLevel_, _parentIdPath_, _parentCodePath_

    this._repeatableItems = {};
    this._updateTreePathFields_NEW(this.items, this);



    // merge skipLogic in all items into this._skipLogicRules
    // merge formula in all items into this._formulas
  //  this._mergeComplexFields();

    // update score rule if there is one
  //  this._updateScoreRule();

  //  this._resetHorizontalTableInfo();


    this._updateLastSiblingStatus_NEW(this.items, null);

    this._updateLastRepeatingItemsStatus_NEW(this.items);
    this._updateLastItemInRepeatingSection_NEW(this.items);

//    this._updateLastItemInRepeatingItemsStatus();

    this.Navigation.setupNavigationMap(this);

    this.itemRefs = [];
    this._updateItemReferenceList(this.items);

    this._standardizeScoreRule_NEW(this.itemRefs);

  },

  /**
   * Reset internal structural data when repeatable items/groups are added or removed.
   * @private
   */
  _resetInternalData: function() {

    this._resetTreeNodes_NEW(this.items);
    this._updateTreeNodes_NEW(this.items,this);
    this._updateLastSiblingStatus_NEW(this.items, null);

    this._updateLastRepeatingItemsStatus_NEW(this.items);
    this._updateLastItemInRepeatingSection_NEW(this.items);

    this.Navigation.setupNavigationMap(this);

    this.itemRefs = [];
    this._updateItemReferenceList(this.items);

  },

  /**
   * Keep a list of items references
   * @private
   */
  _updateItemReferenceList: function(items) {

    for (var i=0, iLen=items.length; i<iLen; i++) {
      var item = items[i];
      this.itemRefs.push(item);
      // process the sub items
      if (item.items && item.items.length > 0) {
        this._updateItemReferenceList(item.items);
      }
    }
  },


  _updateLastSiblingStatus_NEW: function(items, parentSiblingList) {

    for (var i=0, iLen=items.length; i<iLen; i++) {
      var item = items[i];
      // update last sibling status list
      // sub level
      if (parentSiblingList && angular.isArray(parentSiblingList)) {
        // make a copy
        item._lastSiblingList = parentSiblingList.slice();
        item._lastSiblingList.push(item._lastSibling);
      }
      // first level
      else {
        item._lastSiblingList = [item._lastSibling]
      }

      // process the sub items
      if (item.items && item.items.length > 0) {
        this._updateLastSiblingStatus_NEW(item.items, item._lastSiblingList);
      }
    }
  },


  /**
   * Update the score rule if there is one
   * @private
   */
  _updateScoreRule: function() {

    this._hasScoreRule = false;

    for (var i = 0, iLen = this._formulas.length; i < iLen; i++) {
      // check if there is a TOTALSCORE rule
      if (this._formulas[i]["name"] == "TOTALSCORE") {
        this._formulas[i]["value"] = [];
        this._formulas[i]["valueIndex"] = [];
        // set values for _hasScoreRule
        this._hasScoreRule = true;
        // update source item's codePath
        // all the sources should be unique in the form.
        for (var j= 0,jLen=this.items.length; j<jLen; j++) {
          var item = this.items[j];
          // it has an answer list
          if (item.answers) {
            var answers = [];
            if (jQuery.isArray(item.answers)) {
              answers = item.answers;
            }
            // check if any one of the answers has a score
            for (var k = 0, kLen = item.answers.length; k < kLen; k++) {
              if (item.answers[k] && item.answers[k].score >= 0) {
                this._formulas[i]["value"].push(item._codePath);
                this._formulas[i]["valueIndex"].push(j);
                break;
              }
            } // end of answers loop
          } // end if there's an answer list
        } // end of items loop
        break;
      } // end of TOTALSCORE rule
    } // end of formulas loop

  },


  _standardizeScoreRule_NEW: function(itemRefs) {
    for (var i=0, iLen=itemRefs.length; i<iLen; i++) {
      var totalScoreItem = itemRefs[i];

      if (totalScoreItem.calculationMethod && totalScoreItem.calculationMethod.name === 'TOTALSCORE') {

        // TBD, if the parameters values are already supplied,
        totalScoreItem.calculationMethod.value = [];

        for (var j = 0, jLen = itemRefs.length; j < jLen; j++) {
          var item = itemRefs[j];
          // it has an answer list
          if (item.answers) {
            var answers = [];
            if (jQuery.isArray(item.answers)) {
              answers = item.answers;
            }
            // check if any one of the answers has a score
            for (var k = 0, kLen = item.answers.length; k < kLen; k++) {
              if (item.answers[k] && item.answers[k].score >= 0) {
                totalScoreItem.calculationMethod.value.push(item.questionCode);
                break;
              }
            } // end of answers loop
          } // end if there's an answer list
        } // end of items loop
        break;
      }
    }

  },

  /**
   * Set default values if the data is missing.
   * @private
   */
  _setDefaultValues: function() {

    this._codePath = "";
    this._idPath = "";
    this._displayLevel = 0;

    // type
    if (!this.type || this.type.length == 0) {
      this.type = "LOINC"
    }
    // template
    if (!this.template || this.template.length == 0) {
      this.type = "panelTableV"
    }
    // templateOption
    if (!this.templateOption || jQuery.isEmptyObject(this.templateOption)) {
      this.templateOption = {
        obxTableColumns: [
          {"name" : "Name", "formatting":{"width": "50%", "min-width": "4em"}},
          {"name" : "", "formatting":{"width": "5em", "min-width": "5em"}},
          {"name" : "Value", "formatting":{"width": "35%", "min-width": "4em"}},
          {"name" : "Units", "formatting":{"width": "15%", "min-width": "4em"}}
//          {"name" : "Range", "formatting":{"width": "6em", "min-width": "4em"}}
        ],
        obrHeader: true,  // controls if the obr table needs to be displayed
        obrItems: [
          {"question":"Date Done","dataType":"DT","answers":"", "formatting":{"width":"10em","min-width":"4em"}, "answerCardinality":{"min":1, "max":1}},
          {"question":"Time Done","dataType":"TM","answers":"", "formatting":{"width":"12em","min-width":"4em"}},
          {"question":"Where Done","dataType":"CWE","answers":[{"text":"Home","code":"1"},{"text":"Hospital","code":"2"},{"text":"MD Office","code":"3"},{"text":"Lab","code":"4"},{"text":"Other","code":"5"}], "formatting":{"width":"30%","min-width":"4em"}},
          {"question":"Comment","dataType":"ST","answers":"", "formatting":{"width":"70%","min-width":"4em"} }
        ]
      }
    }
  },


  /**
   * Merge data in skipLogic and formula in all records into
   * this._skipLogicRules and this._formulas, respectively
   * @private
   */
  _mergeComplexFields: function() {
    this._skipLogicRules = [];
    this._formulas = [];
    for (var i=0, iLen=this.items.length; i<iLen; i++) {
      var item = this.items[i];
      // merge skipLogic in all items into this._skipLogicRules
      if (item.skipLogic && jQuery.isArray(item.skipLogic)) {
        for (var j= 0, jLen = item.skipLogic.length; j<jLen; j++) {
          if (!jQuery.isEmptyObject(item.skipLogic[j])) {
            var rule = angular.copy(item.skipLogic[j]);
            rule["source"] = item._codePath;
            rule["sourceIndex"] = i;
            // replace the code in targets with codePath
            rule = this._updateSkipLogicTargetCodePathAndIndex(i, rule)
            this._skipLogicRules.push(rule)
          }
        }
      }
      // merge formula in all items into this._formulas
      if (item.formula && !jQuery.isEmptyObject(item.formula)) {
        var formula = angular.copy(item.formula)
        formula["target"] = item._codePath;
        formula["targetIndex"] = i;
        // replace the code in source with codePath, and add source index
        formula = this._updateFormulaSourceCodePathAndIndex(i, formula)
        this._formulas.push(formula)
      }
    }

  },

  /**
   * Get the code paths and indexes of source items of a formula
   * Note:
   * a source item and the target item should be siblings, or
   * a source item should be the target item's descendant, or
   * the target item should be a source item's descendant
   * @param targetItemIndex index of an item in the form items array
   * @param formula a formula
   * @returns formula a formula with updated code paths and indexes of source items
   * @private
   */
  _updateFormulaSourceCodePathAndIndex: function(targetItemIndex, formula) {
    var codePaths = [], valueIndex = [];
    var targetItem = this.items[targetItemIndex];
    for (var j= 0, jLen = formula.value.length; j<jLen; j++) {
      // check each question
      for (var i=0, iLen = this.items.length; i<iLen; i++) {
        var item = this.items[i];
        // the if code matches
        if (item.questionCode == formula.value[j]) {
          // if the source item and the target item are siblings
          if (item._parentCodePath_ === targetItem._parentCodePath_ &&
              item._parentIdPath_ === targetItem._parentIdPath_ ||
              // or the target item is the source item's descendant
              item._codePath.indexOf(targetItem._codePath) === 0 &&
              item._idPath.indexOf(targetItem._idPath) === 0 ||
              // or the source item is the target item's descendant
              targetItem._codePath.indexOf(item._codePath) === 0 &&
              targetItem._idPath.indexOf(item._idPath) === 0 ) {
            // add codePath and index
            codePaths.push(item._codePath)
            valueIndex.push(i);
          }
        } //end if code matches
      } // end of each question
    } // end of each code

    formula["value"] = codePaths;
    formula["valueIndex"] = valueIndex;

    return formula;
  },

  /**
   * Update values of the fields of _id, _idPath, _codePath
   * based on the questionCode and parentQuestionCode
   * and the number of repeating questions
   * tree node type:
   * {"_idPath": idPath of item,
   *  "_codePath": codePath of item,
   *  "index": index in items array,
   *  "children":[tree node 1, ..., tree node n]
   * }
   * @private
   */
  _updateTreePathFields_NEW: function(items, parentItem) {
    // for each item on this level
    for (var i=0, iLen=items.length; i<iLen; i++) {
      var item = items[i];
      if (!item._id) item._id = 1;
      item._codePath = parentItem._codePath + this.PATH_DELIMITER + item.questionCode;
      item._idPath = parentItem._idPath + this.PATH_DELIMITER + item._id;
      item._elementId = item._codePath + item._idPath;
      item._displayLevel = parentItem._displayLevel + 1;
      item._parentItem = parentItem;

      // set last sibling status
      item._lastSibling = i === iLen-1;

      // set default values on the item
      // questionCardinality
      if (!item.questionCardinality) {
        item.questionCardinality = {"min":1, "max":1};
      }
      // answerCardinality
      if (!item.answerCardinality) {
        item.answerCardinality = {"min":0, "max":1};
      }
      // dataType
      if (!item.dataType) {
        item.dataType = "ST";
      }

      // process the sub items
      if (item.items && item.items.length > 0) {
        this._updateTreePathFields_NEW(item.items, item);
      }

      // keep a copy of the repeatable items
      if (this._questionRepeatable(item)) {
        this._repeatableItems[item._codePath] = angular.copy(item);
        item._repeatable = true;
      }


    }
  },

  _updateTreeNodes_NEW: function(items, parentItem) {
    // for each item on this level
    for (var i=0, iLen=items.length; i<iLen; i++) {
      var item = items[i];
      if (!item._id) item._id = 1;
      item._codePath = parentItem._codePath + this.PATH_DELIMITER + item.questionCode;
      item._idPath = parentItem._idPath + this.PATH_DELIMITER + item._id;
      item._elementId = item._codePath + item._idPath;
      item._displayLevel = parentItem._displayLevel + 1;
      item._parentItem = parentItem;

      // set last sibling status
      item._lastSibling = i === iLen-1;

      // process the sub items
      if (item.items && item.items.length > 0) {
        this._updateTreeNodes_NEW(item.items, item);
      }
    }
  },

  /**
   * Find the max _id of the same question within the its parent node
   * @param item an item in the form items array
   * @returns {number}
   */
  getRepeatingItemMaxId_NEW: function(item) {
    var maxId = parseInt(item._id) ;
    if (item._parentItem && Array.isArray(item._parentItem.items)) {
      for (var i= 0, iLen=item._parentItem.items.length; i<iLen; i++) {
        if (item._parentItem.items[i]._codePath == item._codePath &&
          parseInt(item._parentItem.items[i]._id) > maxId ) {
          maxId = parseInt(item._parentItem.items[i]._id);
        }
      }
    }

    //console.log(maxId)
    return maxId;
  },

  getRepeatingItemCount_NEW: function(item) {
    var count = 0;
    if (item._parentItem && Array.isArray(item._parentItem.items)) {
      for (var i= 0, iLen=item._parentItem.items.length; i<iLen; i++) {
        if (item._parentItem.items[i]._codePath == item._codePath) {
          count++;
        }
      }
    }

    return count;
  },

  /**
   * Update the status array that includes the last items of each repeating items and sections
   * If it is a repeating section, the last item is the last leaf node within the last repeating section.
   * @private
   */
  _updateLastRepeatingItemsStatus_NEW: function(items) {


    var iLen = items.length;

    var prevCodePath = '';
    // process all items in the array except the last one
    for (var i=0; i<iLen; i++) {
      var item = items[i];

      if (prevCodePath !== '') {
        // it's a different item, and
        // previous item is a repeating item, set the flag as the last in the repeating set
        if (prevCodePath !== item._codePath && this._questionRepeatable(items[i - 1])) {
          items[i - 1]._lastRepeatingItem = true;
        }
        else {
          items[i - 1]._lastRepeatingItem = false;
        }
      }
      prevCodePath = item._codePath;
      // check sub levels
      if (item.items && item.items.length > 0) {
        this._updateLastRepeatingItemsStatus_NEW(item.items);
      }
    }
    // the last item in the array
    if (this._questionRepeatable(items[iLen-1])) {
      items[iLen-1]._lastRepeatingItem = true;
    }
    else {
      items[iLen-1]._lastRepeatingItem = false;
    }
    // check sub levels
    if (items[iLen-1].items && items[iLen-1].items.length > 0) {
      this._updateLastRepeatingItemsStatus_NEW(items[iLen-1].items);
    }

  },

  _resetTreeNodes_NEW: function(items) {
    for (var i=0, iLen=items.length; i<iLen; i++) {
      items[i]._repeatingSectionList = null;
      // process the sub items
      if (items[i].items && items[i].items.length > 0) {
        this._resetTreeNodes_NEW(items[i].items);
      }
    }

  },

  _updateLastItemInRepeatingSection_NEW: function(items) {
    for (var i=0, iLen=items.length; i<iLen; i++) {
      if (items[i]._lastRepeatingItem) {
        var lastItem = this._getLastSubItem_NEW(items[i]);
        if (lastItem._repeatingSectionList && Array.isArray(lastItem._repeatingSectionList)) {
          lastItem._repeatingSectionList.unshift(items[i]);
        }
        else {
          lastItem._repeatingSectionList = [items[i]];
        }
      }
      // process the sub items
      if (items[i].items && items[i].items.length > 0) {
        this._updateLastItemInRepeatingSection_NEW(items[i].items);
      }
    }

  },

  _getLastSubItem_NEW: function(item) {
    return (item && Array.isArray(item.items) && item.items.length > 0) ?
        this._getLastSubItem_NEW(item.items[item.items.length-1]) : item;
  },

  /**
   * Get the containing repeating item of the last item of repeating items or sections.
   * The containing item is itself if it the last item of a repeating items.
   * @param index index of an item in the form items array
   * @returns {Array}
   */
  getParentRepeatingItemsOfLastItem_NEW: function(item) {
    var ret =[];
    var upItem = item;
    while (upItem && upItem._lastRepeatingItem) {
      ret.push(upItem);
      upItem= upItem._parentItem;
    }
    return ret;

  },

  // NEW
  _traverseTree: function(item, doThing) {
    if (item) {
      doThing(item);
    }
    if (item.items) {
      for (var i=0, iLen=item.items.length; i<iLen; i++) {
        this._traverseTree(item.items[i]);
      }
    }
  },


  /**
   * Check if multiple instances of the question are allowed
   * @param item an item in the form items array
   * @returns {boolean}
   * @private
   */
  _questionRepeatable : function(item) {
  var ret=false;
  if (item.questionCardinality &&
      (item.questionCardinality.max > 1 || item.questionCardinality.max ==-1) ) {
    ret = true
  }
  return ret;
  },


  /**
   * Set internal field values for horizontal table layout
   * Note:
   * 1) "layout" values 'horizontal' and 'vertical' are only set on items whose "header" is true
   * 2) any items within a 'horizontal' table must be a leaf node. i.e. it cannot contain any sub items.
   * 3) all items within a 'horizontal' table has it's "_inHorizontalTable_" set to true, but not the header item itself.
   * 4) _repeatableItems is reused for adding a repeating row in a horizontal table. but the header item will not be added.
   * i.e. the table should not have more than one table title
   *
   * _horizontalTableInfo structure:
   * _horizontalTableInfo: {
   *    headerItem._horizontalTableId : {
   *      tableStartIndex: firstItemIndex (=== firstHeaderItemIndex === h1),
   *      tableEndIndex:   lastItemIndex,
   *      columnHeaders:     [ { label: item.question, id: 'col' + item.elementId }, {...}, ...],
   *      tableHeaders:    [h1, h2, ...]
   *      tableRows:       [{ header: h1, cells : [h1+1, h1+2], ... },
   *                        { header: h2, cells : [h2+1, h2+2], ... },
   *                        ... ],
   *      lastHeaderIndex: lastHeaderItemIndex
   *    }
   *  }
   *
   * @private
   */

  _resetHorizontalTableInfo: function() {



    this._horizontalTableInfo = {};

    var tableHeaderCodePathAndParentIdPath = null;
    var lastTableHeaderIndex = null;
    var hasHorizontalLayout = false;

    for (var i= 0, iLen=this.items.length; i<iLen; i++) {
      var item = this.items[i];
      // header item and horizontal layout
      if (item.header && item.layout == "horizontal" ) {
        hasHorizontalLayout = true;
        // same methods for repeating items could be used for repeating and non-repeating items.
        // (need to rename function names in those 'repeatable' functions.)
        var itemsInRow = [];
        var columnHeaders = [];
        item._inHorizontalTable = true;
        var itemCodePathAndParentIdPath = item._codePath + item._parentIdPath_;
        lastTableHeaderIndex = i;
        // if it's the first row (header) of the first table,
        if (tableHeaderCodePathAndParentIdPath === null ||
            tableHeaderCodePathAndParentIdPath !== itemCodePathAndParentIdPath) {
          // indicate this item is the table header
          tableHeaderCodePathAndParentIdPath = itemCodePathAndParentIdPath;
          item._horizontalTableHeader = true;
          item._horizontalTableId = tableHeaderCodePathAndParentIdPath;

          var range = this._getRepeatableItemsRange(item);
          for (var j=range.start+1; j<=range.end; j++) {
            itemsInRow.push(j);
            columnHeaders.push({label: this.items[j].question, id: "col" + this.items[j]._elementId});
            // indicate the item is in a horizontal table
            this.items[j]._inHorizontalTable = true;
          }

          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath] = {
            tableStartIndex: i,
            tableEndIndex: range.end,
            columnHeaders: columnHeaders,
            tableRows: [{ header: i, cells : itemsInRow }],
            tableHeaders: [i]
          };

          // set the last table/row in horizontal group/table flag
          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath]['lastHeaderIndex'] = lastTableHeaderIndex
        }
        // if it's the following rows, update the tableRows and tableEndIndex
        else if (tableHeaderCodePathAndParentIdPath === itemCodePathAndParentIdPath ) {
          var range = this._getRepeatableItemsRange(item);
          var itemsInRow = [];
          for (var j=range.start+1; j<=range.end; j++) {
            itemsInRow.push(j);
            // indicate the item is in a horizontal table
            this.items[j]._inHorizontalTable = true;
          }
          // update rows index
          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath].tableRows.push({header: i, cells : itemsInRow});
          // update headers index (hidden)
          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath].tableHeaders.push(i);
          // update last item index in the table
          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath].tableEndIndex = range.end;
          // set the last table/row in horizontal group/table flag
          this._horizontalTableInfo[tableHeaderCodePathAndParentIdPath]['lastHeaderIndex'] = lastTableHeaderIndex
        }
      }
    }


  },

  /**
   * Add a repeating item or a repeating group
   * and update related form status
   * @param item an item in the form items array
   */
  addRepeatingItems_NEW: function(item) {

    var maxRecId = this.getRepeatingItemMaxId_NEW(item);
    var newItem = angular.copy(this._repeatableItems[item._codePath]);
    newItem._id = maxRecId + 1;

    if (item._parentItem && Array.isArray(item._parentItem.items)) {
      var insertPosition = 0;
      for (var i= 0, iLen=item._parentItem.items.length; i<iLen; i++) {
        if (item._parentItem.items[i]._codePath == item._codePath &&
          item._parentItem.items[i]._idPath == item._idPath) {
          insertPosition = i;
          break;
        }
      }
      item._parentItem.items.splice(insertPosition + 1, 0, newItem);
      newItem._parentItem = item._parentItem;
    }

    this._resetInternalData();
    var readerMsg = 'Added ' + this.itemDescription(item);
    LFormsData.screenReaderLog(readerMsg);
  },

  /**
   * Remove a repeating item or group
   * @param item an item in the form items array
   */
  removeRepeatingItems_NEW: function(item) {

    if (item._parentItem && Array.isArray(item._parentItem.items)) {
      for (var i = 0, iLen = item._parentItem.items.length; i < iLen; i++) {
        if (item._parentItem.items[i]._codePath == item._codePath &&
          item._parentItem.items[i]._idPath == item._idPath) {
          item._parentItem.items.splice(i, 1);
          break;
        }
      }
    }

    this._resetInternalData();
    var readerMsg = 'Removed ' + this.itemDescription(item);
    LFormsData.screenReaderLog(readerMsg);
  },


  /**
   *  Returns the description of an item (section/question/row).
   * @param item the item whose type is needed
   */
  itemDescription: function(item) {
    return item._inHorizontalTable ?  'row' : item.header? 'section' : 'question';
  },


  /**
   * Check if an item has a total score formula.
   * This is a special case of formula, where sources are not explicitly specified.
   *
   * @param codePath the item's code path.
   * @returns true/false
   */
  isScoreRuleTarget: function(codePath) {

    var ret = false;
    if (this._hasScoreRule) {
      for (var i= 0,ilen=this._formulas.length; i<ilen; i++) {
        if (this._formulas[i].name == 'TOTALSCORE' && this._formulas[i].target == codePath) {
          ret = true;
          break;
        }
      }
    }
    return ret;
  },


  /**
   * Calculate the total score and set the value of the total score formula target field
   * @param scoreRule a total score formula
   * @private
   */
  _calculateTotalScore: function(scoreRule) {
    var totalScore = 0;
    // check all source items
    for(var i= 0, iLen=scoreRule.valueIndex.length; i<iLen; i++) {
      var item = this.items[scoreRule.valueIndex[i]];
      if (item._value && item._value.score ) {
        totalScore += item._value.score;
      }
    }
    // update total score field
    this.items[scoreRule.targetIndex]._value = totalScore;

  },

  _getScores_NEW: function(item, formula) {
    var scores = [];
    var sourceItems = this._getFormulaSourceItems_NEW(item, formula.value);

    for (var i= 0, iLen= sourceItems.length; i<iLen; i++) {
      var item = sourceItems[i];
      var score = 0;
      if (item && item._value && item._value.score ) {
       score = item._value.score
      }
      scores.push(score);
    }
    return scores;
  },

  _getFormulaSourceItems_NEW: function(item, questionCodes) {
    var sourceItems = [];

    for (var i= 0, iLen=questionCodes.length; i<iLen; i++) {
      var questionCode = questionCodes[i];
      var sourceItem = null;
      // check siblings
      if (item._parentItem && Array.isArray(item._parentItem.items)) {
        for (var j= 0, jLen= item._parentItem.items.length; j<jLen; j++) {
          if (item._parentItem.items[j].questionCode === questionCode) {
            sourceItem = item._parentItem.items[j];
            break;
          }
        }
      }
      // check ancestors
      if (!sourceItem) {
        var parentItem = item._parentItem;
        while (parentItem) {
          if (parentItem.questionCode === questionCode) {
            sourceItem = parentItem;
            break;
          }
          parentItem = parentItem._parentItem;
        }
      }
      sourceItems.push(sourceItem);
    }
    return sourceItems;
  },

  _getValuesInStardardUnit_NEW : function(item, formula) {
    var values = [];
    var sourceItems = this._getFormulaSourceItems_NEW(item, formula.value);

    for (var i= 0, iLen= sourceItems.length; i<iLen; i++) {
      var valueInStandardUnit = '';
      var item = sourceItems[i];
      if (item._value) {
        if (item._unit && item._unit.value) {
          valueInStandardUnit = this.Units.getValueInStandardUnit(item._value, item._unit.value);
        }
        else {
          valueInStandardUnit = item._value;
        }
      }
      values.push(valueInStandardUnit);
    }
    return values;
  },

  getFormulaResult_NEW: function(item) {
    var result ='';
    var parameterValues = [];
    if (item.calculationMethod) {
      var formula = item.calculationMethod;
      // run score rule (there should be one score rule only in a form)
      if (formula.name === 'TOTALSCORE') {
        parameterValues = this._getScores_NEW(item, formula);
      }
      // run non-score rules
      else {
        // find the sources and target
        parameterValues = this._getValuesInStardardUnit_NEW(item,formula);
      }
      // calculate the formula result
      result = this.Formulas.calculations_[formula.name](parameterValues)
    }
    return result;
  },

  runFormulas_NEW: function() {
    for (var i= 0, iLen=this.itemRefs.length; i<iLen; i++) {
      var item = this.itemRefs[i];
      if (item.calculationMethod) {
        item._value = this.getFormulaResult_NEW(item);
      }
    }
  },

  /**
   * Run all formulas
   */
  runFormulas: function() {

      // for each the formula, get the parameters values and units
      for (var j= 0,jlen=this._formulas.length; j<jlen; j++) {
        var formula = this._formulas[j];
        // run non-score rules
        if (formula.name != 'TOTALSCORE') {
          // find the sources and target
          var valuesInStandardUnit = this._findFormulaSourcesInStandardUnit(formula);

          // calculate the formula result
          var result = this.Formulas.calculations_[formula.name](valuesInStandardUnit)

          // update target field
          this.items[formula.targetIndex]._value = result;
        }
        // run score rule (there should be one score rule only in a form)
        else {
          this._calculateTotalScore(formula);
        }

      }
  },


  /**
   * Find all source items of a formula
   * @param formula a formula
   * @returns {Array}
   * @private
   */
  _findFormulaSourcesInStandardUnit : function(formula) {
    var values = [];

    for (var i= 0, iLen = formula.valueIndex.length; i<iLen; i++ ) {
      var item = this.items[formula.valueIndex[i]];
      var valueInStandardUnit = '';
      if (item._value) {
        if (item._unit && item._unit.value) {
          valueInStandardUnit = this.Units.getValueInStandardUnit(item._value, item._unit.value);
        }
        else {
          valueInStandardUnit = item._value;
        }
      }
      values.push(valueInStandardUnit);
    }
    return values;
  },

  /**
   * Units modules
   * Embedded in widget-data.js. To be separated as a independent file.
   */
  Units: {
    getValueInStandardUnit: function(value, unit) {
      var result = value * this.units_[unit];
      return result.toFixed(this.precision_);
    },
    getStandardUnit: function() {
      // to be done when 'units_' is redesigned
    },

    precision_ : 4,
    units_ : {
      // 'WEIGHT', kg
      'kg' : 1,
      'kgs' : 1,
      'kilograms' : 1,
      'pounds' : 0.453592,
      'lbs' : 0.453592,
      // 'LENGTH', cm
      'cm' : 1,
      'cms' : 1,
      'centimeters' : 1,
      'feet' : 30.48,
      'ft' : 30.48,
      'inches' : 2.54,
      'meters' : 100,
      'ft-inches' : 2.54  // converted to inches first ???
    }
  },

  /**
   * Formula modules
   * Embedded in widget-data.js. To be separated as a independent file.
   */
  Formulas: {
    calculations_: {
      precision_: 2,
      'TOTALSCORE': function (sources) {
        var totalScore = 0;
        for (var i = 0, ilen = sources.length; i < ilen; i++) {
          totalScore += sources[i];
        }
        return totalScore;
      },
      // BMI = weight (kg) / [height (m)] * 2
      // BMI = weight (lb) / [height (in)] * 2 x 703
      'BMI': function (sources) {
        var ret = '';
        var weightInKg = sources[0], heightInCm = sources[1];
        if (weightInKg && weightInKg != '' && heightInCm && heightInCm != '' && heightInCm != '0') {
          ret = weightInKg / Math.pow((heightInCm / 100), 2);
          ret = ret.toFixed(this.precision_);
        }
        return ret;

      },

      // BSA (m2) = SQR RT ( [Height(cm) x Weight(kg) ] / 3600 )
      'BSA': function (sources) {
        var ret = '';
        var weightInKg = sources[0], heightInCm = sources[1];
        if (weightInKg && weightInKg != '' && heightInCm && heightInKg != '') {
          ret = Math.sqrt(heightInCm * weightInKg / 3600);
          ret = ret.toFixed(this.precision_);
        }
        return ret;

      }
    }
  },

  /**
   * Check if a number is within a range.
   * keys in a range are "minInclusive"/"minExclusive" and/or "maxInclusive"/"maxExclusive"
   * range example: {"minInclusive": 3, "maxInclusive":10}
   * @param range data range
   * @param numValue an item's numeric value
   * @returns {boolean}
   * @private
   */
  _inRange: function(range, numValue) {
    var inRange = false;

    if (range && !isNaN(numValue)) {
      var fields = Object.keys(range);
      // one key
      if (fields.length == 1)  {
        switch (fields[0]) {
          case "minInclusive":
            if (range["minInclusive"] <= numValue) {
              inRange = true;
            }
            break;
          case "minExclusive":
            if (range["minExclusive"] < numValue) {
              inRange = true;
            }
            break;
          case "maxInclusive":
            if (range["maxInclusive"] >= numValue) {
              inRange = true;
            }
            break;
          case "maxExclusive":
            if (range["maxExclusive"] > numValue) {
              inRange = true;
            }
            break;
        } // end of switch
      } // end of one key
      // two keys
      else {
        // check the lower end
        if (range.hasOwnProperty("minInclusive")) {
          if (range["minInclusive"] <= numValue) {
            inRange = true;
          }
        }
        else if (range.hasOwnProperty("minExclusive")) {
          if (range["minExclusive"] < numValue) {
            inRange = true;
          }
        }
        // check the upper end
        if (inRange) {
          if (range.hasOwnProperty("maxInclusive")) {
            if (range["maxInclusive"] >= numValue) {
              inRange = true;
            }
            else {
              inRange = false;
            }
          }
          else if (range.hasOwnProperty("maxExclusive")) {
            if (range["maxExclusive"] > numValue) {
              inRange = true;
            }
            else {
              inRange = false;
            }
          }
        } // end if lower end valid
      } // end of two keys
    } // end of valid range and numValue

    return inRange;

  },

  /**
   * Compare two JavaScript objects
   * @param obj1
   * @param obj2
   * @returns {boolean}
   * @private
   */
  _objectEqual: function(obj1, obj2) {
    var ret = true;

    // different type
    if (typeof obj1 !== typeof obj2 ) {
      ret = false;
    }
    // not object
    else if (typeof obj1 !== "object") {
      if (obj1 !== obj2) {
        ret = false;
      }
    }
    // object
    else {
      var keys1 = Object.keys(obj1);
      var keys2 = Object.keys(obj2);
      if (keys1.length != keys2.length ) {
        ret = false;
      }
      else {
        // from obj1 to obj2
        for (var i= 0, ilen=keys1.length; i<ilen; i++) {
          if (obj1[keys1[i]] != obj2[keys1[i]]) {
            ret = false;
            break;
          }
        }
        // from obj2 to obj1 // not necessary once the lengths have benn checked.
//        if (ret) {
//          for (var i= 0, ilen=keys2.length; i<ilen; i++) {
//            if (obj1[keys2[i]] != obj2[keys2[i]]) {
//              ret = false;
//              break;
//            }
//          }
//        }
      }
    }
    return ret;
  },


  _getSkipLogicSourceItem_NEW: function(item, questionCode) {
    var sourceItem = null;

    // check siblings
    if (item._parentItem && Array.isArray(item._parentItem.items)) {
      for (var i= 1, iLen= item._parentItem.items.length; i<iLen; i++) {
        if (item._parentItem.items[i].questionCode === questionCode) {
          sourceItem = item._parentItem.items[i];
          break;
        }
      }
    }
    // check ancestors
    if (!sourceItem) {
      var parentItem = item._parentItem;
      while (parentItem) {
        if (parentItem.questionCode === questionCode) {
          sourceItem = parentItem;
          break;
        }
        parentItem = parentItem._parentItem;
      }
    }

    return sourceItem;
  },

  _checkSkipLogicCondition_NEW: function(item, trigger) {
    var action = false;
    if (item._value) {
      var currentValue = item._value;

      switch (item.dataType) {
        // answer lists: {"code", "LA-83"}, {"label","A"} and etc.
        // the key is one of the keys in the answers.
        case "CNE":
        case "CWE":
          var field = Object.keys(trigger)[0] ; // trigger should have only one key
          // if the field accepts multiple values from the answer list
          if (Array.isArray(currentValue)) {
            for (var m= 0, mLen = currentValue.length; m<mLen; m++) {
              if (trigger.hasOwnProperty(field) && currentValue[m].hasOwnProperty(field) &&
                this._objectEqual(trigger[field], currentValue[m][field]) ) {
                action = true;
                break;
              }
            }
          }
          else {
            if (trigger.hasOwnProperty(field) && currentValue.hasOwnProperty(field) &&
              this._objectEqual(trigger[field], currentValue[field]) ) {
              action = true;
            }
          }
          break;
        // numbers: {"value: 3}, {"minInclusive": 3, "maxInclusive":10} and etc.
        // available keys: (1) "value", or (2) "minInclusive"/"minExclusive" and/or "maxInclusive"/"maxExclusive"
        case "INT":
        case "REAL":
          var numCurrentValue = parseFloat(currentValue);
          // the skip logic rule has a "value" key
          if (trigger.hasOwnProperty("value")) {
            if (trigger["value"] == numCurrentValue) {
              action = true;
            }
          }
          // the skip logic rule has a range
          else {
            // if within the range
            if (this._inRange(trigger, numCurrentValue)) {
              action = true;
            }
          }
          break;
        // string: {"value": "AAA"}   ( TBD: {"pattern": "/^Loinc/"} )
        // the only key is "value", for now
        case "ST":
          if (trigger.hasOwnProperty("value") && currentValue.hasOwnProperty("value") &&
            trigger["value"] === currentValue["value"] ) {
            action = true;
          }
          break;
        // boolean: {"value": true}, {"value": false}
        // the only key is "value"
        case "BL":
          if (trigger.hasOwnProperty("value") && currentValue.hasOwnProperty("value") &&
            trigger["value"] === currentValue["value"] ) {
            action = true;
          }
          break;
      } // end case
    }

    return action;
  },

  _checkSkipLogicStatus_NEW: function(item) {
    var takeAction = false;
    if (item.skipLogic) {
      var actions = [];
      for (var i= 0, iLen=item.skipLogic.conditions.length; i<iLen; i++) {
        var condition = item.skipLogic.conditions[i];
        var sourceItem = this._getSkipLogicSourceItem_NEW(item, condition.source);
        actions.push(this._checkSkipLogicCondition_NEW(sourceItem, condition.trigger));
      }

      if (!item.skipLogic.logic || item.skipLogic.logic === "AND") {
        var action = true;
        for(var j=0, jLen=actions.length; j<jLen; j++) {
          if (!actions[j]) {
            action = false;
            break;
          }
        }
        takeAction = action;
      }
      else if (item.skipLogic.logic === "OR") {
        for(var j=0, jLen=actions.length; j<jLen; j++) {
          if (actions[j]) {
            takeAction = true;
            break;
          }
        }
      }
    }
    return takeAction;
  },

  getSkipLogicClass_New: function(item) {

    var ret = '';
    if (item.skipLogic) {
      var takeAction = this._checkSkipLogicStatus_NEW(item);

      if (!item.skipLogic.action || item.skipLogic.action === "show") {
        ret = takeAction ? 'target-show' : "target-hide";
      }
      else if (item.skipLogic.action === "hide") {
        ret = takeAction ? 'target-hide' : "target-show";
      }
    }

    return ret;

  },

  /**
   * Check if the form is decided by skip logic as finished.
   * @returns {boolean|*}
   */
  isFormDone: function() {
    return this._formDone;
  },

  /**
   * Check if the question needs an extra input
   * @param item an item in the lforms form items array
   * @returns {boolean}
   */
  needExtra: function(item) {
    var extra = false;
    if (item && item._value) {
      if (jQuery.isArray(item._value)) {
        jQuery.each(item._value, function(index, answer) {
          if (answer.other) {
            extra = true;
            // break
            return false;
          }
        });
      }
      else {
        if (item._value.other) {
          extra = true;
        }
      }
    }
    return extra;

  },

  // Form navigation by keyboard
  Navigation: {
    // keys
    ARROW: {LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40},
    _navigationMap: [],        // a mapping from position (x, y) to element id (_elementId) of every questions.
    _reverseNavigationMap: {}, // a reverse mapping from element id to position, for quick search of positions.

    /**
     * Set up or update the navigation map of all active fields
     * @param lfData the LFormsData object of a form
     */
    setupNavigationMap: function(lfData) {
      var items = lfData.items,
          posX = 0; posY = 0;
      this._navigationMap = [];
      this._reverseNavigationMap = {};
      for (var i=0, iLen=items.length; i<iLen; i++) {
        // not in horizontal tables
        if (!items[i]._inHorizontalTable) {
          // TODO: if it is not a hidden target fields of skip logic rules

          posX = 0; // set x to 0
          this._navigationMap.push([items[i]._elementId]);
          this._reverseNavigationMap[items[i]._elementId] = {x: posX, y: posY};
          posY += 1; // have added a row
        }
        // in horizontal tables and it is a table header
        else if (items[i]._horizontalTableHeader) {
          var tableKey = [items[i]._codePath + items[i]._parentIdPath_];
          var tableInfo = lfData._horizontalTableInfo[tableKey];
          // it is the first table header
          if (tableInfo && tableInfo.tableStartIndex === i) {
            for (var j= 0, jLen = tableInfo.tableRows.length; j < jLen; j++) {
              var tableRowMap = [];
              var tableRow = tableInfo.tableRows[j];
              posX = 0; // new row, set x to 0
              for (var k= 0, kLen = tableRow.cells.length; k < kLen; k++) {
                var cellItem = items[tableRow.cells[k]];
                tableRowMap.push(cellItem._elementId);
                this._reverseNavigationMap[cellItem._elementId] = {x: posX, y: posY};
                posX += 1; // have added a field in the row
              }
              this._navigationMap.push(tableRowMap)
              posY += 1; // have added a row
            }
            // move i to the item right after the horizontal table
            i = tableInfo.tableEndIndex;
          }
        }
        // non header items in horizontal tables are handled above
      }
    },

    /**
     * Find a field's position in navigationMap from its element id
     * @param id id of a DOM element
     * @returns {*} the position in the navigation map array
     */
    getCurrentPosition: function(id) {
      return id ? this._reverseNavigationMap[id] : null;
    },

    /**
     * Find the next field to get focus
     * @param kCode code value of a keyboard key
     * @param id id of a DOM element
     */
    getNextFieldId: function(kCode, id) {
      var nextPos, nextId;
      // if the current position is known
      var curPos = this.getCurrentPosition(id);
      if (curPos) {
        switch(kCode) {
          // Move left
          case this.ARROW.LEFT: {
            // move left one step
            if (curPos.x > 0) {
              nextPos = {
                x: curPos.x - 1,
                y: curPos.y
              };
            }
            // on the leftmost already, move to the end of upper row if there's an upper row
            else if (curPos.y > 0) {
              nextPos = {
                x: this._navigationMap[curPos.y - 1].length - 1,
                y: curPos.y - 1
              };
            }
            // else, it is already the field on the left top corner. do nothing
            break;
          }
          // Move right
          case this.ARROW.RIGHT: {
            // move right one step
            if (curPos.x < this._navigationMap[curPos.y].length - 1) {
              nextPos = {
                x: curPos.x + 1,
                y: curPos.y
              };
            }
            // on the rightmost already, move to the beginning of lower row if there's a lower row
            else if (curPos.y < this._navigationMap.length - 1) {
              nextPos = {
                x: 0,
                y: curPos.y + 1 };
            }
            // else it is already the field on the right bottom corner. do nothing
            break;
          }
          // Move up
          case this.ARROW.UP: {
            // move up one step
            if (curPos.y > 0) {
              // if upper row does not have a field at the same column
              // choose the rightmost field
              var nearbyX = curPos.x;
              if (nearbyX >= this._navigationMap[curPos.y - 1].length) {
                nearbyX = this._navigationMap[curPos.y - 1].length - 1;
              }
              // set new position
              nextPos = {
                x: nearbyX,
                y: curPos.y - 1
              };
            }
            break;
          }
          // Move down
          case this.ARROW.DOWN: {
            // move up one step
            if (curPos.y < this._navigationMap.length - 1) {
              // if lower row does not have a field at the same column
              // choose the rightmost field
              var nearbyX = curPos.x;
              if (nearbyX >= this._navigationMap[curPos.y + 1].length) {
                nearbyX = this._navigationMap[curPos.y + 1].length - 1;
              }
              // set new position
              nextPos = {
                x: nearbyX,
                y: curPos.y + 1
              };
            }
            break;
          }
        } // end of switch
        if (nextPos) {
          nextId = this._navigationMap[nextPos.y][nextPos.x];
        }
      }

      return nextId;
    }

  },

  // TODO: Methods to support versions of auto-saved data
  History: {
    _versions: [],
    _historicalData: [
      { _timeStamp: null,
        _lfData: []
      }
    ],

    goToVersion: function (index) {

    },
    unDoNSteps: function (n) {

    },
    reDoNSteps: function (n) {

    },
    addToVersionList: function () {

    },
    removeVersion: function (index) {

    },
    getVersionDetail: function (index) {

    },
    getVersionList: function () {

    }
  }

});
LFormsData.screenReaderLog = Def.Autocompleter.screenReaderLog;
