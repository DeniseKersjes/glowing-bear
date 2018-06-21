import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Study} from '../models/constraint-models/study';
import {Constraint} from '../models/constraint-models/constraint';
import {TrialVisit} from '../models/constraint-models/trial-visit';
import {ExportJob} from '../models/export-models/export-job';
import {Query} from '../models/query-models/query';
import {SubjectSet} from '../models/constraint-models/subject-set';
import {PedigreeRelationTypeResponse} from '../models/response-models/pedigree-relation-type-response';
import {TransmartTableState} from '../models/transmart-models/transmart-table-state';
import {TransmartDataTable} from '../models/transmart-models/transmart-data-table';
import {TransmartResourceService} from './transmart-services/transmart-resource.service';
import {TransmartQuery} from '../models/transmart-models/transmart-query';
import {DataTable} from '../models/table-models/data-table';
import {TransmartMapper} from '../utilities/transmart-utilities/transmart-mapper';
import {TransmartStudyDimensionElement} from '../models/transmart-models/transmart-study-dimension-element';
import {TransmartStudy} from '../models/transmart-models/transmart-study';
import {ExportDataType} from '../models/export-models/export-data-type';
import {Dimension} from '../models/table-models/dimension';
import {TransmartStudyDimensions} from '../models/transmart-models/transmart-study-dimensions';
import {ConceptConstraint} from '../models/constraint-models/concept-constraint';
import {Aggregate} from '../models/aggregate-models/aggregate';
import {CrossTable} from '../models/table-models/cross-table';
import {TransmartCrossTable} from '../models/transmart-models/transmart-cross-table';
import {ConstraintHelper} from '../utilities/constraint-utilities/constraint-helper';
import {AppConfig} from '../config/app.config';
import {PicSureResourceService} from './picsure-services/picsure-resource.service';
import {ApiType} from '../models/api-type';
import {TransmartConstraintMapper} from '../utilities/transmart-utilities/transmart-constraint-mapper';

/**
 * This service should be the only one aware of the difference between PIC-SURE and tranSMART REST v2 APIs.
 */
@Injectable()
export class ResourceService {

  private apiType: ApiType;

  constructor(private transmartResourceService: TransmartResourceService,
              private picSureResourceService: PicSureResourceService,
              private config: AppConfig) {
    this.apiType = ApiType[String(this.config.getConfig('api-type', 'transmart')).toUpperCase()];
    if (this.apiType === undefined) {
      throw new Error(`api-type ${this.config.getConfig('api-type')} is invalid`);
    }
  }

  init() {
    switch (this.apiType) {
      case ApiType.PICSURE:
        this.picSureResourceService.init();
    }
  }

  // -------------------------------------- utilities calls --------------------------------------

  generateConstraintFromObject(constraintObjectInput: object): Constraint {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return TransmartConstraintMapper.generateConstraintFromObject(constraintObjectInput);

      case ApiType.PICSURE:
        throw new Error('Not supported: PIC-SURE does not support custom constraints from tree');
    }
  }

  // -------------------------------------- tree node calls --------------------------------------
  /**
   * Returns the available studies.
   * @returns {Observable<Study[]>}
   */
  getStudies(): Observable<Study[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getStudies();

      case ApiType.PICSURE:
        return Observable.of([]);
    }
  }

  /**
   * Get tree nodes from the root
   * @param {number} depth - the depth of the tree we want to access
   * @param {boolean} hasCounts - whether we want to include patient and observation counts in the tree nodes
   * @param {boolean} hasTags - whether we want to include metadata in the tree nodes
   * @returns {Observable<Object>}
   */
  getRootTreeNodes(depth: number, hasCounts: boolean, hasTags: boolean): Observable<object> { // todo: to treenode
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getTreeNodes('\\', depth, hasCounts, hasTags);

      case ApiType.PICSURE:
        return this.picSureResourceService.getRootTreeNodes();
    }
  }

  /**
   * Get a specific branch of the tree nodes
   * @param {string} root - the path to the specific tree node
   * @param {number} depth - the depth of the tree we want to access
   * @param {boolean} hasCounts - whether we want to include patient and observation counts in the tree nodes
   * @param {boolean} hasTags - whether we want to include metadata in the tree nodes
   * @returns {Observable<Object>}
   */
  getChildTreeNodes(root: string, depth: number, hasCounts: boolean, hasTags: boolean): Observable<object> { // todo: to treenode
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getTreeNodes(root, depth, hasCounts, hasTags);

      case ApiType.PICSURE:
        return this.picSureResourceService.getChildNodes(root);
    }
  }

  // -------------------------------------- observations calls --------------------------------------
  /**
   * Given a constraint, get the patient counts and observation counts
   * organized per study, then per concept
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCountsPerStudyAndConcept(constraint: Constraint): Observable<object> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getCountsPerStudyAndConcept(constraint);

      case ApiType.PICSURE:
        return Observable.of({});
    }
  }

  /**
   * Give a constraint, get the patient counts and observation counts
   * organized per study
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCountsPerStudy(constraint: Constraint): Observable<object> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getCountsPerStudy(constraint);

      case ApiType.PICSURE:
        throw new Error('getCountsPerStudy() not supported (treeNodeCountsUpdate should be disabled)');
    }
  }

  // -------------------------------------- observation calls --------------------------------------
  /**
   * Give a constraint, get the corresponding patient count and observation count.
   * @param {Constraint} constraint
   * @returns {Observable<Object>}
   */
  getCounts(constraint: Constraint): Observable<object> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getCounts(constraint);

      case ApiType.PICSURE:
        return this.picSureResourceService.getPatientsCounts(constraint)
          .map((patientCount: number) => {
            return {
              patientCount: patientCount,
              observationCount: -1
            }
          });
    }
  }

  // -------------------------------------- aggregate calls --------------------------------------
  /**
   * Get the aggregate based on the given constraint and aggregate options,
   * the options can be {min, max, count, values, average}
   * @param {Constraint} constraint
   * @returns {Observable<object>}
   */
  getAggregate(constraint: ConceptConstraint): Observable<Aggregate> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getAggregate(constraint)
          .map((tmConceptAggregate: object) => {
            return TransmartMapper.mapTransmartConceptAggregate(tmConceptAggregate, constraint.concept.code);
          });

      case ApiType.PICSURE:
        return this.picSureResourceService.getAggregate(constraint.concept);
    }
  }

  // -------------------------------------- trial visit calls --------------------------------------
  /**
   * Given a constraint, normally a concept or a study constraint, return the corresponding trial visit list
   * @param constraint
   * @returns {Observable<R|T>}
   */
  getTrialVisits(constraint: Constraint): Observable<TrialVisit[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getTrialVisits(constraint);

      case ApiType.PICSURE:
        return Observable.of([]);
    }
  }

  // -------------------------------------- pedigree calls --------------------------------------
  /**
   * Get the available pedigree relation types such as parent, child, spouse, sibling and various twin types
   * @returns {Observable<Object[]>}
   */
  getPedigreeRelationTypes(): Observable<PedigreeRelationTypeResponse[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getPedigreeRelationTypes();

      case ApiType.PICSURE:
        return Observable.of([]);
    }
  }

  // -------------------------------------- export calls --------------------------------------
  getExportDataTypes(constraint: Constraint): Observable<ExportDataType[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getExportFileFormats()
          .switchMap(fileFormatNames => {
            return this.transmartResourceService.getExportDataFormats(constraint)
          }, (fileFormatNames, dataFormatNames) => {
            return TransmartMapper.mapTransmartExportFormats(fileFormatNames, dataFormatNames);
          });

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Get the current user's existing export jobs
   * @returns {Observable<ExportJob[]>}
   */
  getExportJobs(): Observable<any[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getExportJobs();

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Create a new export job for the current user, with a given name
   * @param name
   * @returns {Observable<ExportJob>}
   */
  createExportJob(name: string): Observable<ExportJob> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.createExportJob(name);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Run an export job
   * @param {ExportJob} job
   * @param {ExportDataType[]} dataTypes
   * @param {Constraint} constraint
   * @param {DataTable} dataTable - included only if at least one of the formats of elements is 'TSV'
   * @returns {Observable<ExportJob>}
   */
  runExportJob(job: ExportJob,
               dataTypes: ExportDataType[],
               constraint: Constraint,
               dataTable: DataTable): Observable<ExportJob> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        let includeDataTable = false;
        let hasSelectedFormat = false;

        for (let dataType of dataTypes) {
          if (dataType.checked) {
            for (let fileFormat of dataType.fileFormats) {
              if (fileFormat.checked) {
                if (fileFormat.name === 'TSV' && dataType.name === 'clinical') {
                  includeDataTable = true;
                }
                hasSelectedFormat = true;
              }
            }
          }
        }
        if (hasSelectedFormat) {
          const transmartTableState: TransmartTableState = includeDataTable ? TransmartMapper.mapDataTableToTableState(dataTable) : null;
          const elements = TransmartMapper.mapExportDataTypes(dataTypes, this.transmartResourceService.exportDataView);
          return this.transmartResourceService.runExportJob(job.id, constraint, elements, transmartTableState);
        } else {
          return Observable.of(null);
        }

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Given an export job id, return the blob (zipped file) ready to be used on frontend
   * @param jobId
   * @returns {Observable<blob>}
   */
  downloadExportJob(jobId: string) {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.downloadExportJob(jobId);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Cancels an export job with the given export job id
   * @param jobId
   * @returns {Observable<blob>}
   */
  cancelExportJob(jobId: string): Observable<{}> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.cancelExportJob(jobId);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Removes an export job from the jobs table
   * @param jobId
   * @returns {Observable<blob>}
   */
  archiveExportJob(jobId: string): Observable<{}> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.archiveExportJob(jobId);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  // -------------------------------------- query calls --------------------------------------
  /**
   * Get the queries that the current user has saved.
   * @returns {Observable<TransmartQuery[]>}
   */
  getQueries(): Observable<Query[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.getQueries()
          .map((transmartQueries: TransmartQuery[]) => {
            return TransmartMapper.mapTransmartQueries(transmartQueries);
          });

      case ApiType.PICSURE:
        console.warn('getQueries() not supported');
        return Observable.of([]);
    }
  }

  /**
   * Save a new query.
   * @param {Query} query
   * @returns {Observable<Query>}
   */
  saveQuery(query: Query): Observable<Query> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        let transmartQuery: TransmartQuery = TransmartMapper.mapQuery(query);
        return this.transmartResourceService.saveQuery(transmartQuery)
          .map((newlySavedQuery: TransmartQuery) => {
            // since we already know what query we want to save, i.e. the one in the input argument
            // there is no need to use the returned transmart query and map it to Query,
            // it is fine just returning the existing query
            return query;
          });

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Modify an existing query.
   * @param {string} queryId
   * @param {Object} queryBody
   * @returns {Observable<{}>}
   */
  updateQuery(queryId: string, queryBody: object): Observable<{}> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.updateQuery(queryId, queryBody);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  /**
   * Delete an existing query.
   * @param {string} queryId
   * @returns {Observable<any>}
   */
  deleteQuery(queryId: string): Observable<{}> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.deleteQuery(queryId);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  // -------------------------------------- patient set calls --------------------------------------
  saveSubjectSet(name: string, constraint: Constraint): Observable<SubjectSet> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.savePatientSet(name, constraint);

      case ApiType.PICSURE:
        throw new Error('saveSubjectSet() not supported (autoSaveSubjectSets should be disabled)');
    }
  }

  // -------------------------------------- query differences --------------------------------------
  diffQuery(queryId: string): Observable<object[]> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService.diffQuery(queryId);

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

  // -------------------------------------- data table ---------------------------------------------
  getDataTable(dataTable: DataTable): Observable<DataTable> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        let isUsingHeaders = dataTable.isUsingHeaders;
        let offset = dataTable.offset;
        let limit = dataTable.limit;

        return this.getTransmartDimensions(dataTable.constraint)
          .switchMap((transmartStudyDimensions: TransmartStudyDimensions) => {
            let tableState: TransmartTableState =
              TransmartMapper.mapStudyDimensionsToTableState(transmartStudyDimensions, dataTable);
            const constraint: Constraint = dataTable.constraint;
            return this.transmartResourceService.getDataTable(tableState, constraint, offset, limit)
          }, (transmartStudyDimensions: TransmartStudyDimensions, transmartTable: TransmartDataTable) => {
            return TransmartMapper.mapTransmartDataTable(transmartTable, isUsingHeaders, offset, limit)
          });

      case ApiType.PICSURE:
        console.warn('getDataTable() not supported');
        return Observable.of(dataTable);
    }
  }

  /**
   * Gets available dimensions for step 3
   * @param {Constraint} constraint
   * @returns {Observable<Dimension[]>}
   */
  private getTransmartDimensions(constraint: Constraint): Observable<TransmartStudyDimensions> {
    return this.transmartResourceService.getStudyNames(constraint)
      .switchMap((studyElements: TransmartStudyDimensionElement[]) => {
        let studyNames: string[] = TransmartMapper.mapTransmartStudyDimensionElements(studyElements);
        return this.transmartResourceService.getAvailableDimensions(studyNames);
      }, (studyElements: TransmartStudyDimensionElement[], transmartStudies: TransmartStudy[]) => {
        return TransmartMapper.mapStudyDimensions(transmartStudies);
      });
  }

  get transmartExportDataView(): string {
    return this.transmartResourceService.exportDataView;
  }

  get transmartDateColumnIncluded(): boolean {
    return this.transmartResourceService.dateColumnsIncluded;
  }

  set transmartDateColumnIncluded(value: boolean) {
    this.transmartResourceService.dateColumnsIncluded = value;
  }

  // -------------------------------------- cross table ---------------------------------------------
  getCrossTable(crossTable: CrossTable): Observable<CrossTable> {
    switch (this.apiType) {
      case ApiType.TRANSMART:
        return this.transmartResourceService
          .getCrossTable(
            crossTable.constraint,
            crossTable.rowHeaderConstraints.map(constraints => ConstraintHelper.combineSubjectLevelConstraints(constraints)),
            crossTable.columnHeaderConstraints.map(constraints => ConstraintHelper.combineSubjectLevelConstraints(constraints)))
          .map((tmCrossTable: TransmartCrossTable) => {
            return TransmartMapper.mapTransmartCrossTable(tmCrossTable, crossTable);
          });

      case ApiType.PICSURE:
        throw new Error('Not supported');
    }
  }

}
