import {Component, OnInit} from '@angular/core';
import {NavbarService} from '../../services/navbar.service';
import {AppConfig} from '../../config/app.config';

@Component({
  selector: 'gb-side-panel',
  templateUrl: './gb-side-panel.component.html',
  styleUrls: ['./gb-side-panel.component.css']
})
export class GbSidePanelComponent implements OnInit {

  constructor(private navbarService: NavbarService,
              private config: AppConfig) {
  }

  ngOnInit() {
  }

  get isDataSelection(): boolean {
    return this.navbarService.isDataSelection;
  }

  get enableQuerySaving(): boolean {
    return this.config.getConfig('enable-query-saving', true);
  }
}
