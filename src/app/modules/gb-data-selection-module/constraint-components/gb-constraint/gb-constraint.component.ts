import {Component, OnInit, Input, EventEmitter, Output, ElementRef} from '@angular/core';
import {Constraint} from '../../../../models/constraint-models/constraint';
import {TreeNodeService} from '../../../../services/tree-node.service';
import {ConstraintService} from '../../../../services/constraint.service';
import {ResourceService} from '../../../../services/resource.service';
import {CombinationConstraint} from '../../../../models/constraint-models/combination-constraint';
import {StudyConstraint} from '../../../../models/constraint-models/study-constraint';
import {ConceptConstraint} from '../../../../models/constraint-models/concept-constraint';
import {QueryService} from '../../../../services/query.service';
import {Step} from '../../../../models/query-models/step';
import {CombinationState} from '../../../../models/constraint-models/combination-state';
import {TreeNode} from '../../../../models/tree-models/tree-node';
import {AppConfig} from '../../../../config/app.config';

@Component({
  selector: 'gb-constraint',
  templateUrl: './gb-constraint.component.html',
  styleUrls: ['./gb-constraint.component.css']
})
export class GbConstraintComponent implements OnInit {
  @Input() constraint: Constraint;
  @Input() isRoot: boolean;
  @Output() constraintRemoved: EventEmitter<any> = new EventEmitter();
  droppedConstraint: Constraint = null;

  constructor(protected treeNodeService: TreeNodeService,
              protected resourceService: ResourceService,
              protected constraintService: ConstraintService,
              protected queryService: QueryService,
              protected element: ElementRef,
              protected config: AppConfig) {
  }

  ngOnInit() {
    this.addEventListeners();
  }

  /**
   * Emits the constraintRemoved event, indicating the constraint corresponding
   * to this component is to be removed from its parent.
   */
  remove() {
    this.constraintRemoved.emit();
  }

  addEventListeners() {
    let elm = this.element.nativeElement;
    elm.addEventListener('dragenter', this.onDragEnter.bind(this), false);
    elm.addEventListener('dragover', this.onDragOver.bind(this), false);
    elm.addEventListener('dragleave', this.onDragLeave.bind(this), false);
    // capture the event in its capturing phase, instead of the bubbling phase
    // so that parent constraint component handles the event first
    elm.addEventListener('drop', this.onDrop.bind(this), true);
  }

  onDragEnter(event) {
    event.stopPropagation();
    event.preventDefault();
    this.element.nativeElement.firstChild.classList.add('dropzone');
  }

  onDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    this.element.nativeElement.firstChild.classList.add('dropzone');
  }

  onDragLeave(event) {
    this.element.nativeElement.firstChild.classList.remove('dropzone');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.element.nativeElement.firstChild.classList.remove('dropzone');
  }

  update() {
    this.queryService.step = Step.I;
    if (this.queryService.instantCountsUpdate_1) {
      this.queryService.update_1();
    } else {
      this.queryService.isDirty_1 = true;
    }
  }

  get containerClass(): string {
    if (this.element.nativeElement.children[0].classList.length === 0) {
      const containerClassName = (this.constraint.className === 'CombinationConstraint'
        && (<CombinationConstraint>this.constraint).isRoot) ?
        'gb-constraint-container-root ' : 'gb-constraint-container';

      let borderClassName = '';
      if (containerClassName === 'gb-constraint-container') {
        const depth = ConstraintService.depthOfConstraint(this.constraint);
        if (depth === 1) {
          borderClassName = 'gb-constraint-container-border-left-1';
        } else if (depth === 2) {
          borderClassName = 'gb-constraint-container-border-left-2';
        } else if (depth === 3) {
          borderClassName = 'gb-constraint-container-border-left-3';
        } else {
          borderClassName = 'gb-constraint-container-border-left-4';
        }
      }
      return containerClassName + ' ' + borderClassName;
    } else {
      return this.element.nativeElement.children[0].classList.value;
    }
  }

}
