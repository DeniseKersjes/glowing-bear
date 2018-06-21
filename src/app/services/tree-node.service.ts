import {Injectable} from '@angular/core';
import {Concept} from '../models/constraint-models/concept';
import {ConceptConstraint} from '../models/constraint-models/concept-constraint';
import {TreeNode} from '../models/tree-models/tree-node';
import {ResourceService} from './resource.service';
import {ConstraintService} from './constraint.service';
import {NavbarService} from './navbar.service';
import {ConceptType} from '../models/constraint-models/concept-type';
import {TreeNodeType} from '../models/tree-models/tree-node-type';
import {AppConfig} from '../config/app.config';

type LoadingState = 'loading' | 'complete';

@Injectable()
export class TreeNodeService {
  // todo: check if the tree copies are done properly

  /*
   * This service maintains three copies of tree nodes:
   * 1. treeNodes - the entire ontology tree representing the data structure of the backend
   * 2. projectionTreeData - the partial ontology tree representing the tree nodes
   *    corresponding to subject group defined in step 1,
   *    and this partial tree is used for variable selection in step 2
   * 3. finalTreeNodes - the partial ontology tree corresponding to the final tree nodes
   *    that the user has selected in all the steps of data selection
   */
  // the variable that holds the entire tree structure, used by the tree on the left side bar
  private _treeNodes: TreeNode[] = [];
  // the copy of the tree nodes that is used for constructing the tree in the 2nd step (projection)
  private _treeNodesCopy: TreeNode[] = [];
  // the tree data that is rendered in the 2nd step (projection)
  private _projectionTreeData: TreeNode[] = [];
  // the selected tree data in the 2nd step (projection)
  private _selectedProjectionTreeData: TreeNode[] = [];
  // the final tree nodes resulted from data selection
  private _finalTreeNodes: TreeNode[] = [];
  // the selected tree node in the side-panel by dragging
  private _selectedTreeNode: TreeNode = null;

  public treeNodeCallsSent = 0; // the number of tree-node calls sent
  public treeNodeCallsReceived = 0; // the number of tree-node calls received

  // the status indicating the when the tree is being loaded or finished loading
  public loadingTreeNodes: LoadingState = 'complete';


  constructor(private resourceService: ResourceService,
              private navbarService: NavbarService,
              private config: AppConfig) {
  }

  /**
   * Load the tree nodes for rendering the tree on the left side panel;
   * construct concept constraints based on the tree nodes
   */
  public loadTreeNodes(constraintService: ConstraintService) {
    this.loadingTreeNodes = 'loading';
    constraintService.conceptLabels = [];
    // Retrieve all tree nodes and extract the concepts iteratively
    this.resourceService.getRootTreeNodes(2, false, true)
      .subscribe(
        (treeNodes: TreeNode[]) => {
          this.loadingTreeNodes = 'complete';
          // reset concepts and concept constraints
          constraintService.concepts = [];
          constraintService.conceptConstraints = [];
          this.processTreeNodes(treeNodes, constraintService);
          treeNodes.forEach((function (node) {
            this.treeNodes.push(node); // to ensure the treeNodes pointer remains unchanged
            if (this.config.getConfig('enable-greedy-tree-loading', true)) {
              this.loadTreeNext(node, constraintService);
            }
          }).bind(this));
        },
        err => console.error(err)
      );
  }

  /**
   * Loads children of a node (if they were not already loaded).
   * Meant to be used by the UI for the node-per-node browsing.
   * @param {TreeNode} parentNode
   * @param {ConstraintService} constraintService
   */
  public loadChildren(parentNode: TreeNode, constraintService: ConstraintService) {
    if (!parentNode.leaf && !parentNode.childrenAttached) {
      this.loadTreeNext(parentNode, constraintService);
    }
  }

  /**
   * Load the descendants of the given tree node, iteratively if greedy loading is enabled.
   * @param parentNode
   * @param constraintService
   */
  private loadTreeNext(parentNode: TreeNode, constraintService: ConstraintService) {
    this.loadingTreeNodes = 'loading';
    this.treeNodeCallsSent++;
    let depth = 20;
    this.resourceService.getChildTreeNodes(parentNode.path, depth, false, true)
      .subscribe(
        (treeNodes: TreeNode[]) => {
          this.loadingTreeNodes = 'complete';
          this.treeNodeCallsReceived++;
          parentNode.attachChildTree(treeNodes);
          this.processTreeNodes(parentNode.children, constraintService);

          // recursive load of missing children if depth loading is supported
          if (this.config.getConfig('enable-greedy-tree-loading', true)) {
            let descendants = [];
            this.getTreeNodeDescendantsWithDepth(parentNode, depth, descendants);
            if (descendants.length > 0) {
              for (let descendant of descendants) {
                this.loadTreeNext(descendant, constraintService);
              }
            }
          }
        },
        err => console.error(err)
      );
  }

  /**
   * Extracts concepts (and later possibly other dimensions) from the
   *  provided TreeNode array and their children.
   *  And augment tree nodes with PrimeNG tree-ui specifications
   * @param treeNodes
   * @param constraintService
   */
  private processTreeNodes(treeNodes: TreeNode[], constraintService: ConstraintService) {
    if (!treeNodes) {
      return;
    }
    for (let node of treeNodes) {
      this.processTreeNode(node, constraintService);
      if (node.hasChildren()) {
        this.processTreeNodes(node.children, constraintService);
      }
    }
  }

  private processTreeNode(node: TreeNode, constraintService: ConstraintService) {
    // Extract concept
    if (node.nodeType === TreeNodeType.CONCEPT) {
      let concept = this.getConceptFromTreeNode(node);
      if (constraintService.conceptLabels.indexOf(concept.label) === -1) {
        constraintService.concepts.push(concept);
        constraintService.conceptLabels.push(concept.label);
        let constraint = new ConceptConstraint();
        constraint.concept = concept;
        constraintService.conceptConstraints.push(constraint);
        constraintService.allConstraints.push(constraint);
      }
    }
    // Add PrimeNG visual properties for tree nodes
    let countStr = ' ';
    node.label = node.name + countStr;
    if (node.metadata) {
      node.label = node.label + ' ⓘ';
    }

    if (node.leaf) {
      switch (node.conceptType) {
        case ConceptType.NUMERICAL:
          node.icon = 'icon-123';
          break;
        case ConceptType.HIGH_DIM:
          node.icon = 'icon-hd';
          break;
        case ConceptType.CATEGORICAL:
          node.icon = 'icon-abc';
          break;
        case ConceptType.DATE:
          node.icon = 'fa-calendar';
          break;
        case ConceptType.TEXT:
          node.icon = 'fa-newspaper-o';
          break;
        case ConceptType.SIMPLE:
        default:
          node.icon = 'fa-folder-o'; // todo: better logo for simple concepts and modifiers
      }
    } else {
      node.icon = '';
      if (node.nodeType === TreeNodeType.STUDY) {
        node.expandedIcon = 'icon-folder-study-open';
        node.collapsedIcon = 'icon-folder-study';
      } else {
        node.expandedIcon = 'fa-folder-open';
        node.collapsedIcon = 'fa-folder';
      }
    }
  }

  /**
   * Parse a tree node and create the corresponding concept
   * @param {TreeNode} treeNode
   * @returns {Concept}
   */
  public getConceptFromTreeNode(treeNode: TreeNode): Concept {
    let concept = new Concept();
    concept.label = treeNode.displayName;
    concept.path = treeNode.path;
    concept.type = treeNode.conceptType;
    concept.code = treeNode.conceptCode;
    concept.fullName = treeNode.path;
    concept.name = treeNode.name;
    return concept;
  }

  /**
   * Get the descendants of a tree node up to a predefined depth
   * @param {TreeNode} treeNode
   * @param {number} depth
   * @param {TreeNode[]} descendants
   */
  public getTreeNodeDescendantsWithDepth(treeNode: TreeNode,
                                         depth: number,
                                         descendants: TreeNode[]) {
    if (treeNode) {
      if (depth === 2 && treeNode.hasChildren()) {
        for (let child of treeNode.children) {
          descendants.push(child);
        }
      } else if (depth > 2 && treeNode.hasChildren()) {
        for (let child of treeNode.children) {
          let newDepth = depth - 1;
          this.getTreeNodeDescendantsWithDepth(child, newDepth, descendants);
        }
      }
    }
  }

  /**
   * Get the descendants of a tree node if a descendant has a type
   * that is not excluded
   * Returns only directly queryable nodes.
   * If queryable node has queryable children, they will not be included.
   * @param {TreeNode} treeNode
   * @param {TreeNode[]} descendants
   */
  public getQueryableDescendants(treeNode: TreeNode, descendants: TreeNode[]) {
    if (treeNode && treeNode.hasChildren()) {
      for (let child of treeNode.children) {
        if (child.hasChildren()) {
          descendants.push(child);
        } else if (child.hasChildren()) {
          this.getQueryableDescendants(child, descendants);
        }
      }
    }
  }

  /**
   * Update the tree table data for rendering the tree table in step 2, projection
   * based on a given set of concept codes as filtering criteria.
   * @param {Object} conceptCountMap
   * @param checklist
   */
  public updateProjectionTreeData(conceptCountMap: object, checklist: Array<string>) {
    // If the tree nodes copy is empty, create it by duplicating the tree nodes
    if (this.treeNodesCopy.length === 0) {
      this.treeNodesCopy = this.copyTreeNodes(this.treeNodes);
    }
    let conceptCodes = [];
    for (let code in conceptCountMap) {
      conceptCodes.push(code);
    }
    this.projectionTreeData =
      this.updateProjectionTreeDataIterative(this.treeNodesCopy, conceptCodes, conceptCountMap);
    this.selectedProjectionTreeData = [];
    this.checkProjectionTreeDataIterative(this.projectionTreeData, checklist);
  }

  public updateFinalTreeNodes() {
    this.finalTreeNodes = this.copySelectedTreeNodes(this.projectionTreeData);
  }

  private copyTreeNodes(nodes: TreeNode[]): TreeNode[] {
    let nodesCopy = [];
    for (let node of nodes) {
      let parent = node.parent;
      let children = node.children;
      node.parent = null;
      node.children = null;
      let nodeCopy = JSON.parse(JSON.stringify(node));
      if (children) {
        let childrenCopy = this.copyTreeNodes(children);
        nodeCopy.children = childrenCopy;
      }
      nodesCopy.push(nodeCopy);
      node.parent = parent;
      node.children = children;
    }
    return nodesCopy;
  }

  private copySelectedTreeNodes(nodes: TreeNode[]): TreeNode[] {
    let nodesCopy = [];
    for (let node of nodes) {
      // if the node has been partially selected
      let selected = node.partialSelected;
      // if the node has been selected
      selected = selected ? true : this.selectedProjectionTreeData.includes(node);
      if (selected) {
        let parent = node['parent'];
        let children = node['children'];
        node['parent'] = null;
        node['children'] = null;
        let nodeCopy = JSON.parse(JSON.stringify(node));
        if (children) {
          let childrenCopy = this.copySelectedTreeNodes(children);
          nodeCopy['children'] = childrenCopy;
        }
        nodesCopy.push(nodeCopy);
        node['parent'] = parent;
        node['children'] = children;
      }
    }
    return nodesCopy;
  }

  /**
   * Copy the given treenode upward, i.e. excluding its children
   * @param {TreeNode} node
   * @returns {TreeNode}
   */
  private copyTreeNodeUpward(node: TreeNode): TreeNode {
    let nodeCopy = new TreeNode();
    let parentCopy = null;
    for (let key in node) {
      if (key === 'parent') {
        parentCopy = this.copyTreeNodeUpward(node[key]);
      } else if (key !== 'children') {
        nodeCopy[key] = JSON.parse(JSON.stringify(node[key]));
      }
    }
    if (parentCopy) {
      nodeCopy.parent = parentCopy;
    }
    return nodeCopy;
  }

  private updateProjectionTreeDataIterative(nodes: TreeNode[],
                                            conceptCodes: string[],
                                            conceptCountMap: object) {
    let nodesWithCodes = [];
    for (let node of nodes) {
      if (conceptCodes.includes(node.conceptCode)) {
        let nodeCopy = node;
        nodeCopy.expanded = false;
        if (conceptCountMap[node.conceptCode]) {
          const patientCount = conceptCountMap[node.conceptCode]['patientCount'];
          const observationCount = conceptCountMap[node.conceptCode]['observationCount'];
          nodeCopy.label = nodeCopy.name + ` (sub: ${patientCount}, obs: ${observationCount})`;
        }
        nodesWithCodes.push(nodeCopy);
      } else if (node.hasChildren()) {
        let newNodeChildren =
          this.updateProjectionTreeDataIterative(node.children, conceptCodes, conceptCountMap);
        if (newNodeChildren.length > 0) {
          let nodeCopy = this.copyTreeNodeUpward(node);
          nodeCopy.expanded = nodeCopy.depth <= 2;
          nodeCopy.children = newNodeChildren;
          nodesWithCodes.push(nodeCopy);
        }
      }
    }
    return nodesWithCodes;
  }

  private checkProjectionTreeDataIterative(nodes: TreeNode[], checklist?: Array<string>) {
    for (let node of nodes) {
      if (checklist && checklist.includes(node.path)) {
        this.selectedProjectionTreeData.push(node);
      }
      if (node.hasChildren()) {
        this.checkProjectionTreeDataIterative(node.children, checklist);
      }
    }
  }

  public checkAllProjectionTreeDataIterative(nodes: TreeNode[]) {
    for (let node of nodes) {
      this.selectedProjectionTreeData.push(node);
      if (node.hasChildren()) {
        this.checkAllProjectionTreeDataIterative(node.children);
      }
    }
  }

  /**
   * Append a count element to the given treenode-content element
   * @param treeNodeContent
   * @param {number} count
   * @param {boolean} updated - true: add animation to indicate updated count
   */
  private appendCountElement(treeNodeContent, count: number, updated: boolean) {
    const countString = count < 0 ? '...' : '(' + count + ')';
    let countElm = treeNodeContent.querySelector('.gb-count-element');
    if (!countElm) {
      countElm = document.createElement('span');
      countElm.classList.add('gb-count-element');
      if (updated) {
        countElm.classList.add('gb-count-element-updated');
      }
      countElm.textContent = countString;
      treeNodeContent.appendChild(countElm);
    } else {
      const oldCountString = countElm.textContent;
      if (countString !== oldCountString) {
        treeNodeContent.removeChild(countElm);
        countElm = document.createElement('span');
        countElm.classList.add('gb-count-element');
        if (updated) {
          countElm.classList.add('gb-count-element-updated');
        }
        countElm.textContent = countString;
        treeNodeContent.appendChild(countElm);
      }
    }
  }

  /**
   * Update the counts of the study tree nodes of given tree node elements
   *
   * @param treeNodeElements - the visual html elements p-treenode
   * @param {TreeNode} treeNodeData - the underlying data objects
   * @param {object} studyCountMap
   * @param {object} conceptCountMap
   */
  private updateTreeNodeCountsIterative(treeNodeElements: any,
                                        treeNodeData: TreeNode[],
                                        studyCountMap: object,
                                        conceptCountMap: object) {
    let index = 0;
    for (let elm of treeNodeElements) {
      let dataObject: TreeNode = treeNodeData[index];
      if (dataObject.nodeType === TreeNodeType.STUDY || dataObject.nodeType === TreeNodeType.CONCEPT) {
        let treeNodeContent = elm.querySelector('.ui-treenode-content');
        const identifier = dataObject.conceptCode;
        const _map =
          dataObject.nodeType === TreeNodeType.STUDY ? studyCountMap : conceptCountMap;
        const patientCount =
          _map[identifier] ? _map[identifier]['patientCount'] : -1;
        const updated =
          (dataObject['patientCount'] && dataObject['patientCount'] !== patientCount) || !dataObject['patientCount'];
        dataObject['patientCount'] = patientCount;
        this.appendCountElement(treeNodeContent, patientCount, updated);
      }
      // If the tree node is currently expanded
      if (dataObject.expanded) {
        let uiTreenodeChildren = elm.querySelector('.ui-treenode-children');
        if (uiTreenodeChildren) {
          this.updateTreeNodeCountsIterative(
            uiTreenodeChildren.children,
            dataObject.children,
            studyCountMap,
            conceptCountMap);
        }
      }
      index++;
    }
  }

  /**
   * Update the tree nodes' counts on the left panel
   */
  public updateTreeNodeCounts(studyCountMap: object,
                              conceptCountMap: object) {
    // only update the tree node subject counts when it is in data selection
    if (this.navbarService.isDataSelection) {
      let rootTreeNodeElements = document
        .getElementById('tree-nodes-component')
        .querySelector('.ui-tree-container').children;
      this.updateTreeNodeCountsIterative(
        rootTreeNodeElements,
        this.treeNodes,
        studyCountMap,
        conceptCountMap);
    }
  }

  /**
   * Givena tree node path, find the parent tree node paths
   * @param {string} path - taking the form of '\a\tree\node\path\' or '/a/tree/node/path/'
   * @returns {string[]}
   */
  public getParentTreeNodePaths(path: string): string[] {
    let paths: string[] = [];
    const parts = path.split('\\');
    if (parts.length - 2 > 1) {
      let parentPath = '\\';
      for (let i = 1; i < parts.length - 2; i++) {
        parentPath += parts[i] + '\\';
        paths.push(parentPath);
      }
    }
    return paths;
  }

  public expandProjectionTreeDataIterative(nodes: TreeNode[], value: boolean) {
    for (let node of nodes) {
      node.expanded = value;
      if (node.children) {
        if (value) { // If it is expansion, expand it gradually.
          window.setTimeout((function () {
            this.expandProjectionTreeDataIterative(node.children, value);
          }).bind(this), 100);
        } else { // If it is collapse, collapse it immediately
          this.expandProjectionTreeDataIterative(node.children, value);
        }
      }
    }
  }

  /**
   * Given a list of tree nodes, find and return
   * the node(s) that are on the topmost of the hierarchies of their respective branches
   * e.g.
   * given these nodes:
   * [ A\B\C,
   *   A\B
   *   A\D\E,
   *   A\D\E\F,
   *   A\E ]
   * --------------------------
   * return:
   * [ A\B,
   *   A\D\E,
   *   A\E ]
   * @param {TreeNode[]} treeNodes
   * @returns {TreeNode[]}
   */
  public getTopTreeNodes(treeNodes: TreeNode[]): TreeNode[] {
    let candidates = [];
    let result = [];
    for (let node of treeNodes) {
      const path = node.path;
      let isPathUsed = false;
      for (let candidate of candidates) {
        if (path.indexOf(candidate) > -1) {
          // if the candidate is part of the path
          isPathUsed = true;
          break;
        } else if (candidate.indexOf(path) > -1) {
          // if the path is part of the candidate
          // remove the candidate, replace it with the path
          const index = candidates.indexOf(candidate);
          candidates.splice(index, 1);
          candidates.push(path);
          result.splice(index, 1);
          result.push(node);
          isPathUsed = true;
          break;
        }
      }
      if (!isPathUsed) {
        candidates.push(path);
        result.push(node);
      }
    }
    return result;
  }

  /**
   * Find the tree nodes that have the fullNames (i.e. tree paths) in the given paths
   * @param {TreeNode[]} nodes
   * @param {string[]} paths
   * @param {TreeNode[]} foundNodes
   */
  public findTreeNodesByPaths(nodes: TreeNode[], paths: string[], foundNodes: TreeNode[]) {
    for (let node of nodes) {
      if (paths.includes(node.path)) {
        foundNodes.push(node);
      }
      if (node.children) {
        this.findTreeNodesByPaths(node.children, paths, foundNodes);
      }
    }
  }

  /**
   * Check if the tree_nodes calls are finished
   * @returns {boolean}
   */
  public isTreeNodeLoadingComplete(): boolean {
    return this.treeNodeCallsSent === this.treeNodeCallsReceived;
  }

  /**
   * Convert item names to treenode paths
   * @param {TreeNode[]} nodes
   * @param {string[]} items
   * @param {string[]} paths
   */
  public convertItemsToPaths(nodes: TreeNode[], items: string[], paths: string[]) {
    nodes.forEach((node: TreeNode) => {
      if (node) {
        const itemName = ((node || {})['metadata'] || {})['item_name'];
        if (items.indexOf(itemName) > -1) {
          paths.push(node.path);
        }
        if (node.children) {
          this.convertItemsToPaths(node.children, items, paths);
        }
      }
    });
  }

  get treeNodes(): TreeNode[] {
    return this._treeNodes;
  }

  set treeNodes(value: TreeNode[]) {
    this._treeNodes = value;
  }

  get finalTreeNodes(): TreeNode[] {
    return this._finalTreeNodes;
  }

  set finalTreeNodes(value: TreeNode[]) {
    this._finalTreeNodes = value;
  }

  get treeNodesCopy(): TreeNode[] {
    return this._treeNodesCopy;
  }

  set treeNodesCopy(value: TreeNode[]) {
    this._treeNodesCopy = value;
  }

  get projectionTreeData(): TreeNode[] {
    return this._projectionTreeData;
  }

  set projectionTreeData(value: TreeNode[]) {
    this._projectionTreeData = value;
  }

  get selectedProjectionTreeData(): TreeNode[] {
    return this._selectedProjectionTreeData;
  }

  set selectedProjectionTreeData(value: TreeNode[]) {
    this._selectedProjectionTreeData = value;
  }

  get selectedTreeNode(): TreeNode {
    return this._selectedTreeNode;
  }

  set selectedTreeNode(value: TreeNode) {
    this._selectedTreeNode = value;
  }
}
