import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Patient, AssignedPlan, PlanCreationData, ProgressRecord, BodyMetrics } from '../types';
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
            // Fix: Explicitly cast 'planIds' to 'number[]' to resolve type incompatibility with bulkDelete.
            const planIds = plansToDelete.map(p => p.id!) as number[];
            await db.assignedPlans.bulkDelete(planIds);

            await db.patients.delete(id);

            await this.loadPatients();
            await this.loadAssignedPlans();
        } catch (e) {
            console.error("Failed to delete patient", e);
        }
    }
    
    getOverlappingPlans(patientId: number, startDate: string, endDate: string, excludePlanId?: number): AssignedPlan[] {
        const existingAssignments = this.assignedPlans.filter(p => p.patientId === patientId && p.id !== excludePlanId);
        const newStart = new Date(startDate);
        newStart.setHours(0, 0, 0, 0);
        const newEnd = new Date(endDate);
        newEnd.setHours(0, 0, 0, 0);

        return existingAssignments.filter(plan => {
            const oldStart = new Date(plan.startDate);
            oldStart.setHours(0, 0, 0, 0);
            const oldEnd = new Date(plan.endDate);
            oldEnd.setHours(0, 0, 0, 0);
            // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
            return (newStart <= oldEnd) && (newEnd >= oldStart);
        });
    }

    async assignPlanToPatient(patientId: number, planTemplateId: number, startDate: string, endDate: string): Promise<AssignedPlan[] | void> {
        try {
            const overlappingPlans = this.getOverlappingPlans(patientId, startDate, endDate);
            if (overlappingPlans.length > 0) {
                return overlappingPlans;
            }
            
            const planTemplate = nutritionistStore.plans.find(p => p.id === planTemplateId);
            if (!planTemplate) {
                throw new Error("Plan template not found.");
            }

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
            throw e;
        }
    }
    
    async createAndAssignPlan(patientId: number, planData: PlanCreationData, startDate: string, endDate: string) {
        const newAssignment: Omit<AssignedPlan, 'id'> = {
            patientId,
            startDate,
            endDate,
            planData,
        };
        await db.assignedPlans.add(newAssignment as AssignedPlan);
        await this.loadAssignedPlans();
    }
    
    async unassignPlan(assignmentId: number) {
        try {
            await db.assignedPlans.delete(assignmentId);
            await this.loadAssignedPlans();
        } catch (e) {
            console.error(`Failed to unassign plan with ID ${assignmentId}`, e);
        }
    }

    async updateAssignedPlanData(assignmentId: number, planData: PlanCreationData, startDate: string, endDate: string) {
        try {
            const assignment = await db.assignedPlans.get(assignmentId);
            if (assignment) {
                 const updates: Partial<AssignedPlan> = {
                     planData: {
                         ...assignment.planData,
                         ...planData
                     },
                     startDate,
                     endDate
                 };
                 
                await db.assignedPlans.update(assignmentId, updates);
                await this.loadAssignedPlans();
            }
        } catch (e) {
            console.error(`Failed to update assigned plan ${assignmentId}`, e);
            throw e;
        }
    }

    async savePatientProgress(patientId: number, date: string, metrics: BodyMetrics, recordId?: number) {
        try {
            let recordToPut: ProgressRecord;
    
            if (recordId) {
                const existingRecord = await db.progressHistory.get(recordId);
                if (!existingRecord) throw new Error("Record to update not found");
                if (existingRecord.patientId !== patientId) throw new Error("Record does not belong to the specified patient.");
    
                recordToPut = {
                    ...existingRecord,
                    date, // Allow date update
                    ...metrics
                };
            } else {
                let record = await db.progressHistory
                    .where({ patientId: patientId, date: date })
                    .first();
    
                if (!record) {
                    record = {
                        patientId,
                        date,
                        adherence: 0,
                        plannedCalories: 0,
                        actualCalories: 0,
                        stepsTaken: 0,
                        waterIntakeMl: 0,
                    };
                }
                recordToPut = { ...record, ...metrics };
            }
    
            await db.progressHistory.put(recordToPut);
    
            // Also update the patient's latest bodyMetrics as a snapshot
            // Fix: Include percentage-based properties when updating the patient's latest metrics to prevent data loss.
            const latestPatientMetrics: BodyMetrics = {
                weightKg: metrics.weightKg,
                heightCm: metrics.heightCm,
                bodyFatKg: metrics.bodyFatKg,
                bodyFatPercentage: metrics.bodyFatPercentage,
                leanMassKg: metrics.leanMassKg,
                bodyWaterLiters: metrics.bodyWaterLiters,
                bodyWaterPercentage: metrics.bodyWaterPercentage,
            };
            await this.updatePatient(patientId, { bodyMetrics: latestPatientMetrics });
        } catch (error) {
            console.error(`Failed to save progress for patient ${patientId}`, error);
            throw error;
        }
    }
    
    async getProgressHistoryForPatient(patientId: number): Promise<ProgressRecord[]> {
        try {
            return await db.progressHistory
                .where('patientId').equals(patientId)
                .sortBy('date');
        } catch (error) {
            console.error(`Failed to get progress history for patient ${patientId}`, error);
            return [];
        }
    }

    async deletePatientProgress(recordId: number) {
        try {
            await db.progressHistory.delete(recordId);
        } catch (error) {
            console.error(`Failed to delete progress record ${recordId}`, error);
            throw error;
        }
    }
}

export const patientStore = new PatientStore();