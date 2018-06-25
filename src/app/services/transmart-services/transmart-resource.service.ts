import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import 'rxjs/Rx'
import {Study} from '../../models/constraint-models/study';
import {Constraint} from '../../models/constraint-models/constraint';
import {PedigreeRelationTypeResponse} from '../../models/response-models/pedigree-relation-type-response';
import {TrialVisit} from '../../models/constraint-models/trial-visit';
import {ExportJob} from '../../models/export-models/export-job';
import {Query} from '../../models/query-models/query';
import {SubjectSet} from '../../models/constraint-models/subject-set';
import {TransmartTableState} from '../../models/transmart-models/transmart-table-state';
import {TransmartDataTable} from '../../models/transmart-models/transmart-data-table';
import {TransmartQuery} from '../../models/transmart-models/transmart-query';
import {TransmartStudyDimensionElement} from 'app/models/transmart-models/transmart-study-dimension-element';
import {TransmartStudy} from '../../models/transmart-models/transmart-study';
import {AppConfig} from '../../config/app.config';
import {TransmartExportElement} from '../../models/transmart-models/transmart-export-element';
import {TransmartCrossTable} from '../../models/transmart-models/transmart-cross-table';
import {TransmartConstraintMapper} from '../../utilities/transmart-utilities/transmart-constraint-mapper';
import {ErrorHelper} from '../../utilities/error-helper';
import {ApiEndpointService} from '../api-endpoint.service';

@Injectable()
export class TransmartResourceService {

  // the export data view has an alternative 'surveyTable', specifically for NTR project
  private _exportDataView = 'default';
  private _dateColumnsIncluded = true;

  constructor(private appConfig: AppConfig,
              private apiEndpointService: ApiEndpointService) {
    this.exportDataView = appConfig.getConfig('export-data-view', 'default');
  }

  get exportDataView(): string {
    return this._exportDataView;
  }

  set exportDataView(value: string) {
    this._exportDataView = value;
  }

  get dateColumnsIncluded(): boolean {
    return this._dateColumnsIncluded;
  }

  set dateColumnsIncluded(value: boolean) {
    this._dateColumnsIncluded = value;
  }

  // -------------------------------------- tree node calls --------------------------------------
  /**
   * Returns the available studies.
   * @returns {Observable<Study[]>}
   */
  getStudies(): Observable<Study[]> {
    const urlPart = 'studies';
    const responseField = 'studies';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  /**
   * Get a specific branch of the tree nodes
   * @param {string} root - the path to the specific tree node
   * @param {number} depth - the depth of the tree we want to access
   * @param {boolean} hasCounts - whether we want to include patient and observation counts in the tree nodes
   * @param {boolean} hasTags - whether we want to include metadata in the tree nodes
   * @returns {Observable<Object>}
   */
  getTreeNodes(root: string, depth: number, hasCounts: boolean, hasTags: boolean): Observable<object> {
    let urlPart = `tree_nodes?root=${root}&depth=${depth}`;
    if (hasCounts) {
      urlPart += '&counts=true';
    }
    if (hasTags) {
      urlPart += '&tags=true';
    }
    const responseField = 'tree_nodes';
    return this.apiEndpointService.getCall(urlPart, responseField);
    // todo: get that from transmart: node['visualAttributes'].includes('LEAF') = leaf
    // for transmart: !== UNKWOWN: queryable
    // todo: generate the treenode object correctly here
    // todo for transmart: put that in the transmart resource service!
    // this should be done in transamrt specific stuff
    // if (node.constraint) {
    //   node.constraint['fullName'] = node.fullName;
    //   node.constraint['name'] = node.name;
    //   node.constraint['conceptPath'] = node.conceptPath;
    //   node.constraint['conceptCode'] = node.conceptCode;
    //   node.constraint['valueType'] = node.type;
    // }
  }

  // -------------------------------------- observations calls --------------------------------------
  /**
   * Given a constraint, get the patient counts and observation counts
   * organized per study, then per concept
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCountsPerStudyAndConcept(constraint: Constraint): Observable<object> {
    const urlPart = 'observations/counts_per_study_and_concept';
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = 'countsPerStudy';
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  /**
   * Give a constraint, get the patient counts and observation counts
   * organized per study
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCountsPerStudy(constraint: Constraint): Observable<object> {
    const urlPart = 'observations/counts_per_study';
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = 'countsPerStudy';
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  // -------------------------------------- observation calls --------------------------------------
  /**
   * Give a constraint, get the corresponding patient count and observation count.
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCounts(constraint: Constraint): Observable<object> {
    const urlPart = 'observations/counts';
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = false;
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  // -------------------------------------- aggregate calls --------------------------------------
  /**
   * Get the aggregate based on the given constraint and aggregate options,
   * the options can be {min, max, count, values, average}
   * @param {Constraint} constraint
   * @returns {Observable<object>}
   */
  getAggregate(constraint: Constraint): Observable<object> {
    const urlPart = 'observations/aggregates_per_concept';
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = 'aggregatesPerConcept';
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  // -------------------------------------- trial visit calls --------------------------------------
  /**
   * Given a constraint, normally a concept or a study constraint, return the corresponding trial visit list
   * @param constraint
   * @returns {Observable<R|T>}
   */
  getTrialVisits(constraint: Constraint): Observable<TrialVisit[]> {
    const constraintString = JSON.stringify(TransmartConstraintMapper.mapConstraint(constraint));
    const urlPart = `dimensions/trial visit/elements?constraint=${constraintString}`;
    const responseField = 'elements';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  // -------------------------------------- pedigree calls --------------------------------------
  /**
   * Get the available pedigree relation types such as parent, child, spouse, sibling and various twin types
   * @returns {Observable<Object[]>}
   */
  getPedigreeRelationTypes(): Observable<PedigreeRelationTypeResponse[]> {
    const urlPart = 'pedigree/relation_types';
    const responseField = 'relationTypes';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  // -------------------------------------- export calls --------------------------------------
  /**
   * Given a list of patient set ids as strings, get the corresponding data formats available for download
   * @param constraint
   * @returns {Observable<string[]>}
   */
  getExportDataFormats(constraint: Constraint): Observable<string[]> {
    const urlPart = 'export/data_formats';
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = 'dataFormats';
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  getExportFileFormats(): Observable<string[]> {
    const dataView = this.exportDataView;
    const urlPart = `export/file_formats?dataView=${dataView}`;
    const responseField = 'fileFormats';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  /**
   * Get the current user's existing export jobs
   * @returns {Observable<ExportJob[]>}
   */
  getExportJobs(): Observable<any[]> {
    const urlPart = 'export/jobs';
    const responseField = 'exportJobs';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  /**
   * Create a new export job for the current user, with a given name
   * @param name
   * @returns {Observable<ExportJob>}
   */
  createExportJob(name: string): Observable<ExportJob> {
    const urlPart = `export/job?name=${name}`;
    const responseField = 'exportJob';
    return this.apiEndpointService.postCall(urlPart, {}, responseField);
  }

  /**
   * Run an export job:
   * the elements should be an array of objects like this -
   * [{
   *    dataType: 'clinical',
   *    format: 'TSV',
   *    dataView: 'default' | 'surveyTable', // NTR specific
   * }]
   *
   * @param {string} jobId
   * @param {Constraint} constraint
   * @param {TransmartExportElement[]} elements
   * @param {TransmartTableState} tableState - included only, if at least one of the formats of elements is 'TSV'
   * @returns {Observable<ExportJob>}
   */
  runExportJob(jobId: string,
               constraint: Constraint,
               elements: TransmartExportElement[],
               tableState?: TransmartTableState): Observable<ExportJob> {
    const urlPart = `export/${jobId}/run`;
    const responseField = 'exportJob';
    let body = {
      constraint: TransmartConstraintMapper.mapConstraint(constraint),
      elements: elements,
      includeMeasurementDateColumns: this.dateColumnsIncluded
    };
    if (tableState) {
      body['tableConfig'] = tableState;
    }
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  /**
   * Given an export job id, return the blob (zipped file) ready to be used on frontend
   * @param jobId
   * @returns {Observable<blob>}
   */
  downloadExportJob(jobId: string) {
    let urlPart = `export/${jobId}/download`;
    return this.apiEndpointService.getCall(urlPart, undefined, {responseType: 'blob'});
  }

  /**
   * Cancels an export job with the given export job id
   * @param jobId
   * @returns {Observable<blob>}
   */
  cancelExportJob(jobId: string): Observable<{}> {
    const urlPart = `export/${jobId}/cancel`;
    const responseField = 'exportJob';
    return this.apiEndpointService.postCall(urlPart, {}, responseField);
  }

  /**
   * Removes an export job from the jobs table
   * @param jobId
   * @returns {Observable<blob>}
   */
  archiveExportJob(jobId: string): Observable<{}> {
    const urlPart = `export/${jobId}`;
    return this.apiEndpointService.deleteCall(urlPart);
  }

  // -------------------------------------- query calls --------------------------------------
  /**
   * Get the queries that the current user has saved.
   * @returns {Observable<Query[]>}
   */
  getQueries(): Observable<TransmartQuery[]> {
    const urlPart = `queries`;
    const responseField = 'queries';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }
  /**
   * save a new query
   * @param {TransmartQuery} transmartQuery
   * @returns {Observable<TransmartQuery>}
   */
  saveQuery(transmartQuery: TransmartQuery): Observable<TransmartQuery> {
    const urlPart = `queries`;
    const queryBody = {};
    if (transmartQuery.name) {
      queryBody['name'] = transmartQuery.name;
    }
    if (transmartQuery.patientsQuery) {
      queryBody['patientsQuery'] = transmartQuery.patientsQuery;
    }
    if (transmartQuery.observationsQuery) {
      queryBody['observationsQuery'] = transmartQuery.observationsQuery;
    }
    if (transmartQuery.bookmarked) {
      queryBody['bookmarked'] = transmartQuery.bookmarked;
    }
    if (transmartQuery.subscribed) {
      queryBody['subscribed'] = transmartQuery.subscribed;
    }
    if (transmartQuery.subscriptionFreq) {
      queryBody['subscriptionFreq'] = transmartQuery.subscriptionFreq;
    }
    if (transmartQuery.queryBlob) {
      queryBody['queryBlob'] = transmartQuery.queryBlob;
    }
    return this.apiEndpointService.postCall(urlPart, queryBody, null);
  }

  /**
   * Modify an existing query.
   * @param {string} queryId
   * @param {Object} queryBody
   * @returns {Observable<Query>}
   */
  updateQuery(queryId: string, queryBody: object): Observable<{}> {
    const urlPart = `queries/${queryId}`;
    return this.apiEndpointService.putCall(urlPart, queryBody);
  }

  /**
   * Delete an existing query.
   * @param {string} queryId
   * @returns {Observable<any>}
   */
  deleteQuery(queryId: string): Observable<{}> {
    const urlPart = `queries/${queryId}`;
    return this.apiEndpointService.deleteCall(urlPart);
  }

  // -------------------------------------- patient set calls --------------------------------------
  savePatientSet(name: string, constraint: Constraint): Observable<SubjectSet> {
    const urlPart = `patient_sets?name=${name}&reuse=true`;
    const body = TransmartConstraintMapper.mapConstraint(constraint);
    return this.apiEndpointService.postCall(urlPart, body, null);
  }

  // -------------------------------------- query differences --------------------------------------
  diffQuery(queryId: string): Observable<object[]> {
    const urlPart = `queries/${queryId}/sets`;
    const responseField = 'querySets';
    return this.apiEndpointService.getCall(urlPart, responseField);
  }

  // -------------------------------------- data table ---------------------------------------------
  getDataTable(tableState: TransmartTableState,
               constraint: Constraint,
               offset: number, limit: number): Observable<TransmartDataTable> {
    const urlPart = `observations/table`;
    const highDims = ['assay', 'projection', 'biomarker', 'missing_value', 'sample_type'];
    const rowDims = tableState.rowDimensions.filter((dim: string) => {
      return !highDims.includes(dim);
    });
    const colDims = tableState.columnDimensions.filter((dim: string) => {
      return !highDims.includes(dim);
    });
    let body = {
      type: 'clinical',
      constraint: TransmartConstraintMapper.mapConstraint(constraint),
      rowDimensions: rowDims,
      columnDimensions: colDims,
      offset: offset,
      limit: limit,
      rowSort: tableState.rowSort,
      columnSort: tableState.columnSort
    };
    return this.apiEndpointService.postCall(urlPart, body, null);
  }

  getStudyNames(constraint: Constraint): Observable<TransmartStudyDimensionElement[]> {
    const urlPart = `dimensions/study/elements`;
    const body = {constraint: TransmartConstraintMapper.mapConstraint(constraint)};
    const responseField = 'elements';
    return this.apiEndpointService.postCall(urlPart, body, responseField);
  }

  getAvailableDimensions(studyNames: string[]): Observable<TransmartStudy[]> {
    if (studyNames && studyNames.length > 0) {
      let params = JSON.stringify(studyNames);
      const urlPart = `studies/studyIds?studyIds=${params}`;
      const responseField = 'studies';
      return this.apiEndpointService.getCall(urlPart, responseField);
    } else {
      return Observable.of([]);
    }
  }

  getCrossTable(baseConstraint: Constraint,
                rowConstraints: Constraint[],
                columnConstraints: Constraint[]): Observable<TransmartCrossTable> {
    const urlPart = 'observations/crosstable';
    const body = {
      subjectConstraint: TransmartConstraintMapper.mapConstraint(baseConstraint),
      rowConstraints: rowConstraints.map(constraint => TransmartConstraintMapper.mapConstraint(constraint)),
      columnConstraints: columnConstraints.map(constraint => TransmartConstraintMapper.mapConstraint(constraint))
    };
    return this.apiEndpointService.postCall(urlPart, body, null);
  }

}
