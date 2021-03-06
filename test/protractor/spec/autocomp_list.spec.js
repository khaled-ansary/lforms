"use strict";
describe('autocomp list', function() {

  var tp = require('./lforms_testpage.po.js');
  var ff = tp.Autocomp;
  it('should not be visible when the form loads', function() {
    tp.openUSSGFHTVertical();
    expect(ff.searchResults.isDisplayed()).toBeFalsy();
  });

  it('should be visible after the user clicks in a field', function() {
    ff.listField.click();
    browser.wait(function() {
      return ff.searchResults.isDisplayed();
    }, 10000);
    //browser.sleep(5000);
    expect(ff.searchResults.isDisplayed()).toBeTruthy();
  });

  it('should work with multiple-select fields', function() {
    expect(ff.raceField.isDisplayed()).toBeTruthy();
    expect(browser.driver.executeScript('return typeof jQuery(document.getElementById("/54126-8/54134-2/1/1"))[0].autocomp')).toBe('object');
  });

  it('should interoperate with score rules', function() {
    // The data model needs to be correctly updated
    // when the user enters a new value.
    tp.openGlasgowForm();

    browser.wait(function() {
      return ff.eyeField.isDisplayed();
    }, 10000);
    ff.eyeField.click();
    browser.wait(function() {
      return ff.searchResults.isDisplayed();
    }, 10000);
    // Check pre-condition
    expect(ff.scoreField.getAttribute('value')).toEqual('0');
    // Click first item in list, and then the score field to send the change
    // event.
    $('#searchResults li:first-child').click();
    ff.scoreField.click();
    expect(ff.scoreField.getAttribute('value')).toEqual('1');
    // Now try using keystrokes to select the third item.
    ff.eyeField.click();
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.TAB);
    expect(ff.eyeField.getAttribute('value')).toBe("3. Eye opening to verbal command - 3");
    expect(ff.scoreField.getAttribute('value')).toEqual('3');

    // Try the 4th answer, which has a null label
    ff.eyeField.click();
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.ARROW_DOWN);
    ff.eyeField.sendKeys(protractor.Key.TAB);
    expect(ff.eyeField.getAttribute('value')).toBe("4. Eyes open spontaneously - 4");
    expect(ff.scoreField.getAttribute('value')).toEqual('4');
  });

  it('should receive default values set via defaultAnswer', function() {
    tp.openFullFeaturedForm();
    expect(tp.FullFeaturedForm.cneField.getAttribute('value')).toEqual('Answer 2');
  });


  it('should set column headers when specified', function() {
    tp.openHL7GeneticPanel();
    // Open the "simple variation" section
    var kindField = tp.HL7GeneticPanel.kindOfMutations;
    browser.wait(function() {
      return kindField.isDisplayed();
    }, 10000);
    kindField.click();
    kindField.sendKeys(protractor.Key.ARROW_DOWN);
    kindField.sendKeys(protractor.Key.TAB);

    // Bring up the variant ID search results list
    var varIDField = tp.HL7GeneticPanel.variantID;
    browser.wait(function() {
      return varIDField.isDisplayed();
    }, 10000);
    varIDField.click();
    varIDField.sendKeys('ar');

    // Confirm that the header row appears over the search results
    var searchRes = tp.Autocomp.searchResults;
    expect(searchRes.isPresent()).toBe(true);
    var EC = protractor.ExpectedConditions;
    browser.wait(function() {
      return searchRes.isDisplayed();
    }, 10000);
    // This test also checks the escaping of HTML tags
    expect($('#searchResults th:first-child').getText()).toBe('Variant ID <a>');
  });


  it('should autofill lists when there is just one item', function() {
    tp.openRxTerms();
    let rxterms = require('./rxterms.fo');
    tp.Autocomp.helpers.autocompPickFirst(rxterms.drugName, 'AZELEX');
    expect(rxterms.strengthAndForm.getAttribute('value')).toEqual('20% Cream');
  });

});
