import {Component, OnInit, ViewChild} from '@angular/core';
import {GbConstraintComponent} from '../gb-constraint/gb-constraint.component';
import {AutoComplete} from 'primeng/components/autocomplete/autocomplete';
import {Concept} from '../../../../models/constraint-models/concept';
import {ConceptConstraint} from '../../../../models/constraint-models/concept-constraint';
import {GbConceptOperatorState} from './gb-concept-operator-state';
import {ValueConstraint} from '../../../../models/constraint-models/value-constraint';
import {TrialVisit} from '../../../../models/constraint-models/trial-visit';
import {TrialVisitConstraint} from '../../../../models/constraint-models/trial-visit-constraint';
import {UIHelper} from '../../../../utilities/ui-helper';
import {DateOperatorState} from '../../../../models/constraint-models/date-operator-state';
import {CategoricalAggregate} from '../../../../models/aggregate-models/categorical-aggregate';
import {ConceptType} from '../../../../models/constraint-models/concept-type';
import {Aggregate} from '../../../../models/aggregate-models/aggregate';
import {FormatHelper} from '../../../../utilities/format-helper';
import {SelectItem} from 'primeng/api';
import {ErrorHelper} from '../../../../utilities/error-helper';
import {NumericalAggregate} from '../../../../models/aggregate-models/numerical-aggregate';
import {TreeNode} from '../../../../models/tree-models/tree-node';

@Component({
  selector: 'gb-concept-constraint',
  templateUrl: './gb-concept-constraint.component.html',
  styleUrls: ['./gb-concept-constraint.component.css', '../gb-constraint/gb-constraint.component.css']
})
export class GbConceptConstraintComponent extends GbConstraintComponent implements OnInit {
  static readonly valDateOperatorSequence = {
    [DateOperatorState.BETWEEN]: DateOperatorState.AFTER,
    [DateOperatorState.AFTER]: DateOperatorState.BEFORE,
    [DateOperatorState.BEFORE]: DateOperatorState.NOT_BETWEEN,
    [DateOperatorState.NOT_BETWEEN]: DateOperatorState.BETWEEN
  };
  static readonly obsDateOperatorSequence = {
    [DateOperatorState.BETWEEN]: DateOperatorState.AFTER,
    [DateOperatorState.AFTER]: DateOperatorState.BEFORE,
    [DateOperatorState.BEFORE]: DateOperatorState.NOT_BETWEEN,
    [DateOperatorState.NOT_BETWEEN]: DateOperatorState.BETWEEN
  };
  @ViewChild('autoComplete') autoComplete: AutoComplete;
  @ViewChild('categoricalAutoComplete') categoricalAutoComplete: AutoComplete;
  @ViewChild('trialVisitAutoComplete') trialVisitAutoComplete: AutoComplete;

  ConceptType = ConceptType;

  private _searchResults: Concept[];
  private _operatorState: GbConceptOperatorState;
  private _isMinEqual: boolean;
  private _isMaxEqual: boolean;

  /*
   * numeric value range
   */
  private _equalVal: number;
  private _minVal: number;
  private _maxVal: number;
  private _minLimit: number;
  private _maxLimit: number;

  /*
   * date value range
   */
  private _valDateOperatorState: DateOperatorState = DateOperatorState.BETWEEN;
  public ValDateOperatorStateEnum = DateOperatorState; // make enum visible in template
  private _valDate1: Date;
  private _valDate2: Date;

  /*
   * categorical value range
   */
  selectedCategories: string[];
  suggestedCategories: SelectItem[];

  // ------ more options ------
  /*
   * flag indicating if to show more options
   */
  private _showMoreOptions = false;

  /*
   * observation date range (i.e. the reported date range)
   */
  private _applyObsDateConstraint = false;
  private _obsDateOperatorState: DateOperatorState = DateOperatorState.BETWEEN;
  public ObsDateOperatorStateEnum = DateOperatorState; // make enum visible in template
  private _obsDate1: Date;
  private _obsDate2: Date;

  // trial visit
  private _applyTrialVisitConstraint = false;
  private _allTrialVisits: TrialVisit[];
  private _selectedTrialVisits: TrialVisit[];
  private _suggestedTrialVisits: TrialVisit[];

  ngOnInit() {
    this.initializeConstraints();
  }

  initializeConstraints() {
    // Initialize aggregate values
    this.isMinEqual = true;
    this.isMaxEqual = true;
    this.operatorState = GbConceptOperatorState.BETWEEN;

    this.selectedCategories = [];
    this.suggestedCategories = [];

    this._obsDateOperatorState = DateOperatorState.BETWEEN;

    let constraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    if (constraint.concept) {
      // Construct a new constraint that only has the concept as sub constraint
      // (We don't want to apply value and date constraints when getting aggregates)
      let conceptOnlyConstraint: ConceptConstraint = new ConceptConstraint();
      conceptOnlyConstraint.concept = constraint.concept;
      this.resourceService.getAggregate(conceptOnlyConstraint)
        .subscribe((responseAggregate: Aggregate) => {
          console.log(`Processing aggregate of ${constraint.concept.name}, type ${constraint.concept.type.toString()}`);
          if (!responseAggregate) {
            return;
          }

          constraint.concept.aggregate = responseAggregate;
          switch (constraint.concept.type) {
            case ConceptType.NUMERICAL:
              this.handleNumericAggregate(responseAggregate);
              break;
            case ConceptType.CATEGORICAL:
              this.handleCategoricalAggregate(responseAggregate);
              break;
            case ConceptType.DATE:
              this.handleDateAggregate(responseAggregate);
              break;
            default:
              console.log(`Concept type ${constraint.concept.type.toString()} does not need processing`);
              break;
          }
        },
        err => ErrorHelper.handleError(err)
        );

      // Initialize the dates from the time constraint
      // Because the date picker represents the date/time in the local timezone,
      // we need to correct the date that is actually used in the constraint.
      this.applyObsDateConstraint = constraint.applyObsDateConstraint;
      let date1 = constraint.obsDateConstraint.date1;
      this.obsDate1 = new Date(date1.getTime() + 60000 * date1.getTimezoneOffset());
      let date2 = constraint.obsDateConstraint.date2;
      this.obsDate2 = new Date(date2.getTime() + 60000 * date2.getTimezoneOffset());
      this.obsDateOperatorState = constraint.obsDateConstraint.dateOperator;

      // Initialize the available trial visits of the trial visit constraint
      this.applyTrialVisitConstraint = constraint.applyTrialVisitConstraint;
      this.allTrialVisits = [];
      this.selectedTrialVisits = [];
      this.suggestedTrialVisits = [];
      this.resourceService.getTrialVisits(conceptOnlyConstraint)
        .subscribe(
          visits => {
            this.handleTrialVisits(visits);
          },
          err => ErrorHelper.handleError(err)
        );

      // Initialize flags
      this.showMoreOptions = this.applyObsDateConstraint || this.applyTrialVisitConstraint;
    }
  }

  handleNumericAggregate(responseAggregate: Aggregate) {
    let constraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    let numAggregate = responseAggregate as NumericalAggregate;
    this.minLimit = numAggregate.min;
    this.maxLimit = numAggregate.max;
    // if there is existing numeric values
    // fill their values in
    if (constraint.valueConstraints.length > 0) {
      for (let val of constraint.valueConstraints) {
        if (val.operator.includes('>')) {
          this.minVal = val.value;
        } else if (val.operator.includes('<')) {
          this.maxVal = val.value;
        } else if (val.operator === '=') {
          this.equalVal = val.value;
          this.operatorState = GbConceptOperatorState.EQUAL;
        } else {
          console.warn(`Unknown operator: ${val.operator}`)
        }
      }
    }
  }

  handleCategoricalAggregate(responseAggregate: Aggregate) {
    let constraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    let catAggregate = responseAggregate as CategoricalAggregate;
    let values = catAggregate.values;
    let valueCounts = catAggregate.valueCounts;
    // if there is existing value constraints
    // use their values as selected categories
    if (constraint.valueConstraints.length > 0) {
      values = [];
      for (let val of constraint.valueConstraints) {
        values.push(val.value);
      }
    }
    this.suggestedCategories = this.generateCategoricalValueItems(valueCounts, values);
    this.selectedCategories = this.suggestedCategories.map((item: SelectItem) => {
      return item.value;
    });
  }

  handleDateAggregate(responseAggregate: Aggregate) {
    let constraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    let dateAggregate = responseAggregate as NumericalAggregate;
    let date1 = constraint.valDateConstraint.date1;
    let date2 = constraint.valDateConstraint.date2;
    if (Math.abs(date1.getTime() - date2.getTime()) < 1000) {
      this.valDate1 = new Date(dateAggregate.min);
      this.valDate2 = new Date(dateAggregate.max);
    } else {
      this.valDate1 = new Date(date1.getTime() + 60000 * date1.getTimezoneOffset());
      this.valDate2 = new Date(date2.getTime() + 60000 * date2.getTimezoneOffset());
    }
    this.valDateOperatorState = constraint.valDateConstraint.dateOperator;
  }

  handleTrialVisits(visits) {
    let constraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    this.allTrialVisits = visits;
    this.selectedTrialVisits = visits.slice(0);
    constraint.trialVisitConstraint.trialVisits = visits.slice(0);
  }

  generateCategoricalValueItems(valueCounts: Map<string, number>, targetValues: string[]): SelectItem[] {
    let items = [];
    targetValues.forEach((target) => {
      if (valueCounts.has(target)) {
        const count = valueCounts.get(target);
        items.push({
          label: target + ' (' + count + ')',
          value: target
        });
      }
    });
    return items;
  }

  /*
   * -------------------- getters and setters --------------------
   */
  get selectedConcept(): Concept {
    return (<ConceptConstraint>this.constraint).concept;
  }

  set selectedConcept(value: Concept) {
    (<ConceptConstraint>this.constraint).concept = value;
    this.initializeConstraints();
    this.update();
  }

  get applyObsDateConstraint(): boolean {
    return this._applyObsDateConstraint;
  }

  set applyObsDateConstraint(value: boolean) {
    this._applyObsDateConstraint = value;
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.applyObsDateConstraint = this._applyObsDateConstraint;
    if (conceptConstraint.applyObsDateConstraint) {
      this.update();
    }
  }

  get obsDate1(): Date {
    return this._obsDate1;
  }

  set obsDate1(value: Date) {
    // Ignore invalid values
    if (!value) {
      return;
    }
    this._obsDate1 = value;
  }

  get obsDate2(): Date {
    return this._obsDate2;
  }

  set obsDate2(value: Date) {
    // Ignore invalid values
    if (!value) {
      return;
    }
    this._obsDate2 = value;
  }

  get obsDateOperatorState(): DateOperatorState {
    return this._obsDateOperatorState;
  }

  set obsDateOperatorState(value: DateOperatorState) {
    this._obsDateOperatorState = value;
  }

  get applyTrialVisitConstraint(): boolean {
    return this._applyTrialVisitConstraint;
  }

  set applyTrialVisitConstraint(value: boolean) {
    this._applyTrialVisitConstraint = value;
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.applyTrialVisitConstraint = this.applyTrialVisitConstraint;
    if (conceptConstraint.applyTrialVisitConstraint) {
      this.update();
    }
  }

  get allTrialVisits(): TrialVisit[] {
    return this._allTrialVisits;
  }

  set allTrialVisits(value: TrialVisit[]) {
    this._allTrialVisits = value;
  }

  get selectedTrialVisits(): TrialVisit[] {
    return this._selectedTrialVisits;
  }

  set selectedTrialVisits(value: TrialVisit[]) {
    this._selectedTrialVisits = value;
  }

  get suggestedTrialVisits(): TrialVisit[] {
    return this._suggestedTrialVisits;
  }

  set suggestedTrialVisits(value: TrialVisit[]) {
    this._suggestedTrialVisits = value;
  }

  get valDate1(): Date {
    return this._valDate1;
  }

  set valDate1(value: Date) {
    this._valDate1 = value;
  }

  get valDate2(): Date {
    return this._valDate2;
  }

  set valDate2(value: Date) {
    this._valDate2 = value;
  }

  get valDateOperatorState(): DateOperatorState {
    return this._valDateOperatorState;
  }

  set valDateOperatorState(value: DateOperatorState) {
    this._valDateOperatorState = value;
  }

  /*
   * -------------------- event handlers: concept autocomplete --------------------
   */
  /**
   * when the user searches through concept list
   * @param event
   */
  onSearch(event) {
    let query = event.query.toLowerCase();
    let concepts = this.constraintService.concepts;
    if (query) {
      this.searchResults = concepts.filter((concept: Concept) => concept.path.toLowerCase().includes(query));
    } else {
      this.searchResults = concepts;
    }
  }

  /**
   * when user clicks the concept list dropdown
   * @param event
   */
  onDropdown(event) {
    let concepts = this.constraintService.concepts;

    // Workaround for dropdown not showing properly, as described in
    // https://github.com/primefaces/primeng/issues/745
    this.searchResults = [];
    this.searchResults = concepts;
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();
    if (this.autoComplete.panelVisible) {
      this.autoComplete.hide();
    } else {
      this.autoComplete.show();
    }
    UIHelper.removePrimeNgLoaderIcon(this.element, 200);
  }

  // todo: missing types (TEXT)
  updateConceptValues() {
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    if (conceptConstraint.concept.type === ConceptType.NUMERICAL) { // if the concept is numeric
      this.updateNumericConceptValues();
    } else if (conceptConstraint.concept.type === ConceptType.CATEGORICAL) {// else if the concept is categorical
      this.updateCategoricalConceptValues();
    } else if (conceptConstraint.concept.type === ConceptType.DATE) {
      this.updateDateConceptValues();
    }
    this.update();
  }

  updateNumericConceptValues() {
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    // if to define a single value
    if (this.operatorState === GbConceptOperatorState.EQUAL) {
      let newVal: ValueConstraint = new ValueConstraint();
      newVal.operator = '=';
      newVal.value = this.equalVal;
      conceptConstraint.valueConstraints = [];
      conceptConstraint.valueConstraints.push(newVal);
      // else if to define a value range
    } else if (this.operatorState === GbConceptOperatorState.BETWEEN) {
      conceptConstraint.valueConstraints = [];

      let newMinVal: ValueConstraint = new ValueConstraint();
      newMinVal.operator = '>';
      if (this.isMinEqual) {
        newMinVal.operator = '>=';
      }
      newMinVal.value = this.minVal;
      conceptConstraint.valueConstraints.push(newMinVal);

      let newMaxVal: ValueConstraint = new ValueConstraint();
      newMaxVal.operator = '<';
      if (this.isMaxEqual) {
        newMaxVal.operator = '<=';
      }
      newMaxVal.value = this.maxVal;
      conceptConstraint.valueConstraints.push(newMaxVal);
    }
  }

  updateCategoricalConceptValues() {
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.valueConstraints = [];
    for (let category of this.selectedCategories) {
      let newVal: ValueConstraint = new ValueConstraint();
      newVal.operator = '=';
      newVal.value = category;
      conceptConstraint.valueConstraints.push(newVal);
    }
  }

  updateDateConceptValues() {
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.applyValDateConstraint = true;
    const val1 = this.valDate1;
    if (val1) {
      let correctedDate1 = new Date(val1.getTime() - 60000 * val1.getTimezoneOffset());
      conceptConstraint.valDateConstraint.date1 = correctedDate1;
    }
    const val2 = this.valDate2;
    if (val2) {
      let correctedDate2 = new Date(val2.getTime() - 60000 * val2.getTimezoneOffset());
      conceptConstraint.valDateConstraint.date2 = correctedDate2;
    }
  }

  /*
   * -------------------- event handlers: trial-visit autocomplete --------------------
   */
  /**
   * when the user searches through the trial-visit list of a selected concept
   * @param event
   */
  onTrialVisitSearch(event) {
    let query = event.query.toLowerCase().trim();
    let trialVisits = this.allTrialVisits;
    if (query) {
      this.suggestedTrialVisits =
        trialVisits.filter((category: TrialVisit) => category.relTimeLabel.toLowerCase().includes(query));
    } else {
      this.suggestedTrialVisits = trialVisits;
    }
  }

  onTrialVisitDropdown(event) {
    // Workaround for dropdown not showing properly, as described in
    // https://github.com/primefaces/primeng/issues/745
    this.suggestedTrialVisits = this.allTrialVisits.slice(0);
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();
    if (this.trialVisitAutoComplete.panelVisible) {
      this.trialVisitAutoComplete.hide();
    } else {
      this.trialVisitAutoComplete.show();
    }
  }

  selectAllTrialVisits() {
    this.selectedTrialVisits = this.allTrialVisits.slice(0);
    this.updateTrialVisitValues();
  }

  clearAllTrialVisits() {
    this.selectedTrialVisits = [];
    this.updateTrialVisitValues();
  }

  updateTrialVisitValues() {
    let trialVisitConstraint: TrialVisitConstraint = (<ConceptConstraint>this.constraint).trialVisitConstraint;
    trialVisitConstraint.trialVisits = this.selectedTrialVisits.slice(0);
    this.update();
  }

  onUnselectTrialVisit(visit) {
    let index = this.selectedTrialVisits.indexOf(visit);
    this.selectedTrialVisits.splice(index, 1);
    this.updateTrialVisitValues();
  }

  /*
   * -------------------- event handlers: observation-date --------------------
   */
  updateObservationDateValues() {
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    // Because the date picker represents the date/time in the local timezone,
    // we need to correct the date that is actually used in the constraint.
    const val1 = this.obsDate1;
    let correctedDate1 = new Date(val1.getTime() - 60000 * val1.getTimezoneOffset());
    conceptConstraint.obsDateConstraint.date1 = correctedDate1;
    const val2 = this.obsDate2;
    let correctedDate2 = new Date(val2.getTime() - 60000 * val2.getTimezoneOffset());
    conceptConstraint.obsDateConstraint.date2 = correctedDate2;
    this.update();
  }

  /*
   * -------------------- state checkers --------------------
   */

  get constraintConcept(): Concept {
    return (<ConceptConstraint>this.constraint).concept;
  }

  isBetween() {
    return this.operatorState === GbConceptOperatorState.BETWEEN;
  }

  /**
   * Switch the operator state of the current NUMERIC constraint
   */
  switchOperatorState() {
    if (this.selectedConcept.type === ConceptType.NUMERICAL) {
      this.operatorState =
        (this.operatorState === GbConceptOperatorState.EQUAL) ?
          (this.operatorState = GbConceptOperatorState.BETWEEN) :
          (this.operatorState = GbConceptOperatorState.EQUAL);
    }
    this.updateConceptValues();
  }

  getOperatorButtonName() {
    let name = '';
    if (this.selectedConcept.type === ConceptType.NUMERICAL || this.selectedConcept.type === ConceptType.DATE) {
      name = (this.operatorState === GbConceptOperatorState.BETWEEN) ? 'between' : 'equal to';
    }
    return name;
  }

  /**
   * Switch the operator state of the observation date constraint of the current constraint
   */
  switchObsDateOperatorState() {
    // Select the next state in the operator sequence
    this.obsDateOperatorState =
      GbConceptConstraintComponent.obsDateOperatorSequence[this.obsDateOperatorState];
    // Update the constraint
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.obsDateConstraint.dateOperator = this.obsDateOperatorState;
    conceptConstraint.obsDateConstraint.isNegated =
      (this.obsDateOperatorState === DateOperatorState.NOT_BETWEEN);
    // Notify constraint service
    this.update();
  }

  /**
   * Switch the operator state of the current DATE constraint
   */
  switchValDateOperatorState() {
    // Select the next state in the operator sequence
    this.valDateOperatorState =
      GbConceptConstraintComponent.valDateOperatorSequence[this.valDateOperatorState];
    // Update the constraint
    let conceptConstraint: ConceptConstraint = <ConceptConstraint>this.constraint;
    conceptConstraint.valDateConstraint.dateOperator = this.valDateOperatorState;
    conceptConstraint.valDateConstraint.isNegated =
      (this.valDateOperatorState === DateOperatorState.NOT_BETWEEN);
    this.updateConceptValues();
  }

  /**
   * Toggle the 'more options' panel
   */
  toggleMoreOptions() {
    this.showMoreOptions = !this.showMoreOptions;
  }

  onDrop(event: DragEvent) {
    event.stopPropagation();
    let selectedNode: TreeNode = this.treeNodeService.selectedTreeNode;
    this.droppedConstraint =
      this.constraintService.generateConstraintFromTreeNode(selectedNode, selectedNode['dropMode']);
    this.treeNodeService.selectedTreeNode = null;
    if (this.droppedConstraint) {
      this.constraint = this.droppedConstraint;
      // TODO: still needs to update the aggregates fo the ConceptConstraintComponent?
      this.update();
    }
  }

  get operatorState(): GbConceptOperatorState {
    return this._operatorState;
  }

  set operatorState(value: GbConceptOperatorState) {
    this._operatorState = value;
  }

  get isMinEqual(): boolean {
    return this._isMinEqual;
  }

  set isMinEqual(value: boolean) {
    this._isMinEqual = value;
  }

  get isMaxEqual(): boolean {
    return this._isMaxEqual;
  }

  set isMaxEqual(value: boolean) {
    this._isMaxEqual = value;
  }

  get minVal(): number {
    return this._minVal;
  }

  set minVal(value: number) {
    this._minVal = value;
  }

  get maxVal(): number {
    return this._maxVal;
  }

  set maxVal(value: number) {
    this._maxVal = value;
  }

  get maxLimit(): number {
    return this._maxLimit;
  }

  set maxLimit(value: number) {
    this._maxLimit = value;
  }

  get minLimit(): number {
    return this._minLimit;
  }

  set minLimit(value: number) {
    this._minLimit = value;
  }

  get equalVal(): number {
    return this._equalVal;
  }

  set equalVal(value: number) {
    this._equalVal = value;
  }

  get searchResults(): Concept[] {
    return this._searchResults;
  }

  set searchResults(value: Concept[]) {
    this._searchResults = value;
  }

  get showMoreOptions(): boolean {
    return this._showMoreOptions;
  }

  set showMoreOptions(value: boolean) {
    this._showMoreOptions = value;
  }
}
