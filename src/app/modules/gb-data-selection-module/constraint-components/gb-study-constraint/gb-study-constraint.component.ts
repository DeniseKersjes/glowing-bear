import {Component, OnInit, ViewChild} from '@angular/core';
import {Study} from '../../../../models/constraint-models/study';
import {StudyConstraint} from '../../../../models/constraint-models/study-constraint';
import {GbConstraintComponent} from '../gb-constraint/gb-constraint.component';
import {AutoComplete} from 'primeng/components/autocomplete/autocomplete';
import {UIHelper} from '../../../../utilities/ui-helper';
import {TreeNode} from '../../../../models/tree-models/tree-node';

@Component({
  selector: 'gb-study-constraint',
  templateUrl: './gb-study-constraint.component.html',
  styleUrls: ['./gb-study-constraint.component.css', '../gb-constraint/gb-constraint.component.css']
})
export class GbStudyConstraintComponent extends GbConstraintComponent implements OnInit {

  @ViewChild('autoComplete') autoComplete: AutoComplete;

  searchResults: Study[];

  ngOnInit() {
  }

  get selectedStudies(): Study[] {
    return (<StudyConstraint>this.constraint).studies;
  }

  set selectedStudies(value: Study[]) {
    (<StudyConstraint>this.constraint).studies = value;
  }

  onSearch(event) {
    let query = event.query.toLowerCase();
    let studies = this.constraintService.studies;
    if (query) {
      this.searchResults = studies.filter((study: Study) => study.studyId.toLowerCase().includes(query));
    } else {
      this.searchResults = studies;
    }
  }

  onDropdown(event) {
    let studies = this.constraintService.studies;

    // Workaround for dropdown not showing properly, as described in
    // https://github.com/primefaces/primeng/issues/745
    this.searchResults = [];
    this.searchResults = studies;
    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();
    if (this.autoComplete.panelVisible) {
      this.autoComplete.hide();
    } else {
      this.autoComplete.show();
    }
    UIHelper.removePrimeNgLoaderIcon(this.element, 200);
  }

  onUnselect(studyObject) {
    // For some funny reason, the study is still in the list when this handler is invoked
    let index = this.selectedStudies.indexOf(studyObject);
    this.selectedStudies.splice(index, 1);
    this.update();
  }

  updateStudies(studyObject) {
    this.update();
  }

  onDrop(event: DragEvent) {
    event.stopPropagation();
    let selectedNode: TreeNode = this.treeNodeService.selectedTreeNode;
    this.droppedConstraint =
      this.constraintService.generateConstraintFromTreeNode(selectedNode, selectedNode.dropMode);
    this.treeNodeService.selectedTreeNode = null;
    if (this.droppedConstraint) {
      let study = (<StudyConstraint>this.droppedConstraint).studies[0];
      let studies = (<StudyConstraint>this.constraint).studies;
      studies = studies.filter(item => item.studyId === study.studyId);
      if (studies.length === 0) {
        (<StudyConstraint>this.constraint).studies.push(study);
        this.update();
      }
    }
  }

}
