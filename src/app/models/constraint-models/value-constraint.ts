import {Constraint} from './constraint';
import {FormatHelper} from '../../utilities/format-helper';

export class ValueConstraint extends Constraint {

  private _operator: string;
  private _value: any;

  constructor() {
    super();
    this.textRepresentation = 'Value';
  }

  get operator(): string {
    return this._operator;
  }

  set operator(value: string) {
    this._operator = value;
  }

  get value(): any {
    return this._value;
  }

  set value(value: any) {
    this._value = value;
    this.textRepresentation = value ? FormatHelper.nullValuePlaceholder : value.toString();
  }

  get className(): string {
    return 'ValueConstraint';
  }
}
