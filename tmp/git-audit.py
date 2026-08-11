import os, subprocess, sys
os.chdir(r'D:\poultry-farm-management')
paths = [
    'src/app/dashboard/companies/page.tsx',
    'src/app/dashboard/companies/[id]/page.tsx',
    'src/app/dashboard/sales/page.tsx',
    'src/app/dashboard/sales/sale-form.tsx',
    'src/components/dashboard/sales-entry-popup.tsx',
    'src/components/dashboard/stock/stock-management.tsx',
    'src/features/stock/actions.ts',
    'src/features/purchases/actions.ts',
]
print('CWD', os.getcwd())
print('STATUS')
print(subprocess.check_output(['git','status','--short'], text=True))
for p in paths:
    print('\n--- DIFF', p, '---')
    try:
        print(subprocess.check_output(['git','diff','--', p], text=True))
    except subprocess.CalledProcessError as e:
        print('ERROR', e.output)
