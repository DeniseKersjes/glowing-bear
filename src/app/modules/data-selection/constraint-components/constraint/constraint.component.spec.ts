import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ConstraintComponent} from './constraint.component';
import {GenericComponentMock} from '../../../shared/mocks/generic.component.mock';
import {DimensionRegistryService} from '../../../shared/services/dimension-registry.service';
import {DimensionRegistryServiceMock} from '../../../shared/mocks/dimension-registry.service.mock';
import {ResourceService} from '../../../shared/services/resource.service';
import {ResourceServiceMock} from '../../../shared/mocks/resource.service.mock';
import {ConstraintService} from '../../../shared/services/constraint.service';
import {ConstraintServiceMock} from '../../../shared/mocks/constraint.service.mock';
import {StudyConstraint} from '../../../shared/models/constraints/study-constraint';
import {ConceptConstraint} from '../../../shared/models/constraints/concept-constraint';
import {CombinationConstraint} from '../../../shared/models/constraints/combination-constraint';

describe('ConstraintComponent', () => {
  let component: ConstraintComponent;
  let fixture: ComponentFixture<ConstraintComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ConstraintComponent,
        GenericComponentMock({selector: 'combination-constraint', inputs: ['constraint']}),
        GenericComponentMock({selector: 'study-constraint', inputs: ['constraint']}),
        GenericComponentMock({selector: 'concept-constraint', inputs: ['constraint']})
      ],
      providers: [
        {
          provide: DimensionRegistryService,
          useClass: DimensionRegistryServiceMock
        },
        {
          provide: ResourceService,
          useClass: ResourceServiceMock
        },
        {
          provide: ConstraintService,
          useClass: ConstraintServiceMock
        }
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConstraintComponent);
    component = fixture.componentInstance;
    component.constraint = new StudyConstraint();
    fixture.detectChanges();
  });

  it('should create ConstraintComponent for StudyConstraint', () => {
    component.constraint = new StudyConstraint();
    expect(component.constraint.getClassName()).toBe('StudyConstraint');
    expect(component).toBeTruthy();
  });

  it('should create ConstraintComponent for ConceptConstraint', () => {
    component.constraint = new ConceptConstraint();
    expect(component.constraint.getClassName()).toBe('ConceptConstraint');
    expect(component).toBeTruthy();
  });

  it('should create ConstraintComponent for CombinationConstraint', () => {
    component.constraint = new CombinationConstraint();
    expect(component.constraint.getClassName()).toBe('CombinationConstraint');
    expect(component).toBeTruthy();
  });

});
