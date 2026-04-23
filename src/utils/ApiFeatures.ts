import { Query } from 'mongoose';

export default class ApiFeatures {
    // mongooseQuery: الاستعلام اللي بنبنيه
    // queryString: الـ req.query اللي جاي من الراوت
    constructor(public mongooseQuery: Query<any[], any>, public queryString: any) {}

    pagination() {
        let page = Number(this.queryString.page) || 1;
        if (page <= 0) page = 1;
        const limit = Number(this.queryString.limit) || 12; // خليها مرنة
        const skip = (page - 1) * limit;
        
        this.mongooseQuery.skip(skip).limit(limit);
        return this;
    }

    filter() {
        let filterObj = { ...this.queryString };
        const excludedFields = ['page', 'keyword', 'sort', 'fields', 'limit'];
        excludedFields.forEach(q => delete filterObj[q]);

        // تحويل الـ operators زي (gt, gte) لـ ($gt, $gte)
        let queryStr = JSON.stringify(filterObj);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);
        
        this.mongooseQuery.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.mongooseQuery.sort(sortBy);
        } else {
            this.mongooseQuery.sort('-createdAt'); // ترتيب افتراضي من الأحدث
        }
        return this;
    }

    search() {
        if (this.queryString.keyword) {
            this.mongooseQuery.find({
                $or: [
                    { title: { $regex: this.queryString.keyword, $options: 'i' } },
                    { description: { $regex: this.queryString.keyword, $options: 'i' } }
                ]
            });
        }
        return this;
    }

    fields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.mongooseQuery.select(fields);
        }
        return this;
    }
}
