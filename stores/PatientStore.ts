import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Patient, AssignedPlan, PlanCreationData } from '../types';
import { nutritionistStore } from './NutritionistStore';

class PatientStore {
    patients: Patient[] = [];
    assignedPlans: AssignedPlan[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadPatients();
        this.loadAssignedPlans();
    }

    async loadPatients() {
        this.status = 'loading';
        try {
            const patientsFromDb = await db.patients.orderBy('lastName').toArray();
            runInAction(() => {
                this.patients = patientsFromDb;
                this.status = 'ready';
            });
        } catch (e) {
            console.error("Failed to load patients from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
        }
    }
    
    async loadAssignedPlans() {
        try {
            const plans = await db.assignedPlans.toArray();
            runInAction(() => {
                this.assignedPlans = plans;
            });
        } catch (e) {
            console.error("Failed to load assigned plans from DB", e);
        }
    }

    async addPatient(patient: { firstName: string, lastName: string }) {
        try {
            const newPatient: Omit<Patient, 'id'> = {
                ...patient,
                creationDate: new Date().toISOString(),
            };
            const id = await db.patients.add(newPatient as Patient);
            await this.loadPatients();
            return id;
        } catch (e) {
            console.error("Failed to add patient", e);
            throw e;
        }
    }

    async updatePatient(id: number, updates: Partial<Patient>) {
        try {
            await db.patients.update(id, updates);
            await this.loadPatients();
        } catch (e) {
            console.error(`Failed to update patient ${id}`, e);
            throw e;
        }
    }

    async deletePatient(id: number) {
        try {
            // Also delete all assigned plans for this patient
            const plansToDelete = this.assignedPlans.filter(p => p.patientId === id);
            const planIds = plansToDelete.map(p => p.id!);
            await db.assignedPlans.bulkDelete(planIds);

            await db.patients.delete(id);

            await this.loadPatients();
            await this.loadAssignedPlans();
        } catch (e) {
            console.error("Failed to delete patient", e);
        }
    }
    
    async assignPlanToPatient(patientId: number, planTemplateId: number, startDate: string, endDate: string) {
        try {
            // Overlap validation
            const existingAssignments = this.assignedPlans.filter(p => p.patientId === patientId);
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);

            const isOverlap = existingAssignments.some(plan => {
                const oldStart = new Date(plan.startDate);
                const oldEnd = new Date(plan.endDate);
                return (newStart <= oldEnd) && (newEnd >= oldStart);
            });

            if (isOverlap) {
                throw new Error("The selected date range overlaps with an existing plan for this patient.");
            }
            
            // Get template
            const planTemplate = nutritionistStore.plans.find(p => p.id === planTemplateId);
            if (!planTemplate) {
                throw new Error("Plan template not found.");
            }

            // Create a deep copy for personalization
            const planDataCopy = JSON.parse(JSON.stringify(planTemplate.planData));

            const newAssignment: Omit<AssignedPlan, 'id'> = {
                patientId,
                planTemplateId,
                startDate,
                endDate,
                planData: planDataCopy,
            };

            await db.assignedPlans.add(newAssignment as AssignedPlan);
            await this.loadAssignedPlans();
        } catch (e) {
            console.error(`Failed to assign plan ${planTemplateId} to patient ${patientId}`, e);
            throw e; // re-throw to be caught by the UI
        }
    }
    
    async unassignPlan(assignmentId: number) {
        try {
            await db.assignedPlans.delete(assignmentId);
            await this.loadAssignedPlans();
        } catch (e) {
            console.error(`Failed to unassign plan with ID ${assignmentId}`, e);
        }
    }

    async updateAssignedPlanData(assignmentId: number, planData: PlanCreationData) {
        try {
            const assignment = await db.assignedPlans.get(assignmentId);
            if (assignment) {
                 // Only update the planData part of the assignment
                const updatedPlanData = {
                    ...assignment.planData,
                    ...planData
                };
                await db.assignedPlans.update(assignmentId, { planData: updatedPlanData });
                await this.loadAssignedPlans();
            }
        } catch (e) {
            console.error(`Failed to update assigned plan ${assignmentId}`, e);
            throw e;
        }
    }

    async updateAssignedPlanDates(assignmentId: number, startDate: string, endDate: string) {
        try {
            await db.assignedPlans.update(assignmentId, { startDate, endDate });
            await this.loadAssignedPlans();
        } catch (e) {
            console.error(`Failed to update dates for assigned plan ${assignmentId}`, e);
            throw e;
        }
    }
}

export const patientStore = new PatientStore();